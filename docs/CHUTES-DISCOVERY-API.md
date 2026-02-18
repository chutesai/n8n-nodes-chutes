# Automatic Chute Discovery System

This document explains the **automatic OpenAPI discovery system** built for n8n-nodes-chutes. The innovation here is that the code **automatically figures out what any chute can do at runtime** without hardcoding model-specific logic.

## The Problem

When integrating with AI model APIs, you typically face two bad options:

1. **Hardcode everything** - Write custom code for each model, breaking whenever APIs change
2. **Generic wrapper** - Make users figure out the exact parameters for each model themselves

Both suck. We built a third option: **automatic discovery and adaptation**.

## The Solution: Runtime Discovery

Our system:

1. **Fetches** the chute's OpenAPI schema at runtime
2. **Parses** the schema to understand available endpoints and parameters
3. **Infers** capabilities based on parameter patterns
4. **Adapts** user inputs to match what each chute expects
5. **Falls back** gracefully when schemas are missing or broken

This means:
- ✅ Works with **any** chute without code changes
- ✅ Automatically adapts when APIs change
- ✅ Users don't need to know each model's quirks
- ✅ New chutes work immediately

## Architecture Overview

```
User Request
    ↓
┌───────────────────────────────────────┐
│ 1. Fetch OpenAPI Schema               │
│    GET {chuteUrl}/openapi.json        │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 2. Parse Schema Structure             │
│    - Extract endpoints (/generate)    │
│    - Extract parameters (prompt, etc) │
│    - Detect required vs optional      │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 3. Infer Capabilities                 │
│    - Text-to-video? (has prompt)      │
│    - Image-to-video? (has image+text) │
│    - Image edit? (has image_b64s[])   │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 4. Map User Parameters                │
│    - prompt → text/description        │
│    - image → image_b64/image_url      │
│    - guidance_scale → cfg_scale       │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 5. Build Request + Send               │
│    POST {chuteUrl}/{discovered_path}  │
└───────────────────────────────────────┘
```

## Core Components

### 1. Schema Fetching with Caching

**File:** `nodes/Chutes/transport/openApiDiscovery.ts`

The system fetches OpenAPI schemas but caches them for 1 hour to avoid repeated requests:

```typescript
// Cache schema responses (1 hour TTL)
const schemaCache = new Map<string, { schema: IDataObject; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function discoverChuteCapabilities(
  chuteBaseUrl: string,
  apiKey: string,
): Promise<ChuteCapabilities> {
  let schema: IDataObject | undefined;

  // Check cache first
  const cached = schemaCache.get(chuteBaseUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    schema = cached.schema;
  } else {
    // Fetch schema from chute
    const response = await fetch(`${chuteBaseUrl}/openapi.json`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (response.ok) {
      schema = await response.json();
      schemaCache.set(chuteBaseUrl, { schema, timestamp: Date.now() });
    }
  }
  
  // Continue with parsing...
}
```

**Why caching?** OpenAPI schemas rarely change during a session, and fetching them for every request would be wasteful.

### 2. Parameter Extraction

The system walks the OpenAPI schema to extract all parameters and their properties:

```typescript
// Extract parameters from requestBody schema
if (operation.requestBody) {
  const requestBody = operation.requestBody as IDataObject;
  const content = requestBody.content as IDataObject;

  if (content && content['application/json']) {
    const jsonContent = content['application/json'] as IDataObject;
    const schemaObj = jsonContent.schema as IDataObject;

    if (schemaObj && schemaObj.properties) {
      const properties = schemaObj.properties as IDataObject;
      const required = (schemaObj.required || []) as string[];

      for (const paramName in properties) {
        const paramSchema = properties[paramName] as IDataObject;
        
        parameters.push({
          name: paramName,
          required: required.includes(paramName),
          type: (paramSchema.type as string) || 'string',
        });
      }
    }
  }
}
```

**Special case:** Some chutes wrap parameters in an `input_args` object. We automatically unwrap these:

```typescript
// Unwrap "input_args" object to get nested parameters
// Chutes.ai format: { input_args: { prompt: ..., image_b64s: [...], ... } }
if (paramName === 'input_args' && paramSchema.type === 'object' && paramSchema.properties) {
  const nestedProps = paramSchema.properties as IDataObject;
  const nestedRequired = (paramSchema.required || []) as string[];
  
  for (const nestedName in nestedProps) {
    const nestedSchema = nestedProps[nestedName] as IDataObject;
    parameters.push({
      name: nestedName,
      required: nestedRequired.includes(nestedName),
      type: (nestedSchema.type as string) || 'string',
    });
  }
}
```

### 3. Capability Inference

This is the clever part - we **infer what a chute can do** by analyzing its parameter combinations:

```typescript
// Detect capabilities based on path and parameters
const hasPrompt = parameters.some((p) => p.name === 'prompt' || p.name === 'text');
const hasImage = parameters.some(
  (p) => p.name === 'image' || p.name === 'image_b64' || p.name === 'image_url',
);
const hasImageArray = parameters.some((p) => p.name === 'image_b64s' && p.type === 'array');

// Text-to-video: Has prompt but no image input
if (path === '/text2video' || (hasPrompt && !hasImage)) {
  capabilities.supportsTextToVideo = true;
  capabilities.textToVideoPath = path;
}

// Image-to-video: Has both prompt and image
if (path === '/image2video' || (hasPrompt && hasImage)) {
  capabilities.supportsImageToVideo = true;
  capabilities.imageToVideoPath = path;
}

// Image editing: Has image array parameter (Qwen pattern)
if (path === '/edit' || (path === '/generate' && hasPrompt && hasImageArray)) {
  capabilities.supportsImageEdit = true;
  capabilities.imageEditPath = path;
}
```

**The logic:** Instead of asking "is this model X?", we ask "what parameters does it accept?" and infer capabilities from that.

### 4. Intelligent Parameter Mapping

Different chutes use different parameter names for the same concept. We automatically map them:

```typescript
// Map common parameter aliases
const parameterMappings: Record<string, string[]> = {
  prompt: ['prompt', 'text', 'description'],
  image: ['image', 'image_b64', 'image_url', 'input_image'],
  image_b64s: ['image_b64s'], // No aliases - prevent unwanted conversion
  resolution: ['resolution', 'size', 'dimensions'],
  steps: ['steps', 'num_inference_steps', 'sampling_steps'],
  fps: ['fps', 'frame_rate', 'frames_per_second'],
  frames: ['frames', 'num_frames', 'frame_num'],
  seed: ['seed', 'random_seed'],
  guidance_scale: ['cfg_guidance_scale', 'guidance_scale', 'true_cfg_scale', 'cfg_scale'],
  negative_prompt: ['negative_prompt', 'neg_prompt'],
};

// Try to map user's parameter to what the endpoint expects
for (const userKey in userInputs) {
  // Try direct mapping first
  if (endpointParams.has(userKey)) {
    requestBody[userKey] = userInputs[userKey];
  } else {
    // Try alias mapping
    const aliases = parameterMappings[userKey];
    if (aliases) {
      for (const alias of aliases) {
        if (endpointParams.has(alias)) {
          requestBody[alias] = userInputs[userKey];
          break;
        }
      }
    }
  }
}
```

**Example:** User passes `guidance_scale`, but the chute expects `cfg_guidance_scale`. We automatically translate.

### 5. Format Conversions

Different chutes expect different formats. We detect and convert automatically:

#### Resolution → Width/Height

```typescript
// LTX-2: Convert resolution string to separate width/height integers
// Format: "1280*720" -> { width: 1280, height: 720 }
if (modifiedInputs.resolution && typeof modifiedInputs.resolution === 'string') {
  const hasWidthParam = endpointParams.has('width');
  const hasHeightParam = endpointParams.has('height');
  const hasResolutionParam = endpointParams.has('resolution');
  
  // Only convert if endpoint expects width/height but not resolution
  if ((hasWidthParam || hasHeightParam) && !hasResolutionParam) {
    const parts = String(modifiedInputs.resolution).split('*');
    if (parts.length === 2) {
      let width = parseInt(parts[0], 10);
      let height = parseInt(parts[1], 10);
      
      // LTX-2 specifically requires dimensions divisible by 64
      const isLTX2 = chuteUrl && chuteUrl.toLowerCase().includes('ltx');
      if (isLTX2) {
        width = Math.round(width / 64) * 64;
        height = Math.round(height / 64) * 64;
      }
      
      modifiedInputs.width = width;
      modifiedInputs.height = height;
      delete modifiedInputs.resolution;
    }
  }
}
```

#### Width/Height → Size String

```typescript
// Convert width/height to size format if endpoint expects "size" parameter
// This is common for OpenAI-compatible endpoints like /v1/images/edits
if (modifiedInputs.width && modifiedInputs.height && endpointParams.has('size')) {
  // Convert to "WIDTHxHEIGHT" format (e.g., "1024x1024")
  modifiedInputs.size = `${modifiedInputs.width}x${modifiedInputs.height}`;
  
  // Remove width/height if endpoint doesn't expect them
  if (!endpointParams.has('width')) delete modifiedInputs.width;
  if (!endpointParams.has('height')) delete modifiedInputs.height;
}
```

#### Singular Image → Image Array

```typescript
// Qwen Image Edit expects array of 1-3 images: image_b64s: ["data:image/png;base64,..."]
// But users naturally pass a single image for single-image edits
if (isImageEditOp && modifiedInputs.image && endpointParams.has('image_b64s')) {
  modifiedInputs.image_b64s = [modifiedInputs.image];
  delete modifiedInputs.image;
  console.log(`[OpenAPI] Converted singular image to image_b64s array`);
}
```

### 6. Fallback Logic

Real-world APIs are messy. Schemas might be missing, broken, or incomplete. We handle this gracefully:

```typescript
// Check for broken/placeholder schemas
const hasBrokenSchema = pathKeys.some(p => 
  p.includes('{path}') || p === '{path}' || p.startsWith('{')
);

if (hasBrokenSchema) {
  console.warn(`[OpenAPI] Detected broken schema - using fallback`);
  // Skip schema processing, use fallback logic
}

// If no endpoints discovered, add common fallbacks
if (capabilities.endpoints.length === 0 || !hasInferenceEndpoints) {
  capabilities.endpoints.push(
    {
      path: '/generate',
      method: 'POST',
      parameters: [
        { name: 'prompt', required: true, type: 'string' },
        { name: 'image', required: false, type: 'string' },
        { name: 'image_b64', required: false, type: 'string' },
        { name: 'num_inference_steps', required: false, type: 'integer' },
        // ... common parameters
      ],
    },
    // ... other common endpoints
  );
}

// ALWAYS assume support if we couldn't determine for certain
if (!capabilities.supportsTextToVideo && !capabilities.supportsImageToVideo) {
  capabilities.supportsTextToVideo = true;
  capabilities.supportsImageToVideo = true;
}
```

**Philosophy:** Better to try and get a 404 than to block the user completely. Most chutes share common patterns.

## Real-World Examples

### Example 1: Video Generation (TypeScript)

This shows how the system automatically adapts to different video models:

```typescript
import { discoverChuteCapabilities, buildRequestBody } from './openApiDiscovery';

async function generateVideo(
  chuteUrl: string,
  apiKey: string,
  userInputs: {
    prompt: string;
    image?: string;
    resolution?: string;
    steps?: number;
  }
) {
  // 1. Discover what this chute can do
  const capabilities = await discoverChuteCapabilities(chuteUrl, apiKey);
  
  console.log('Discovered capabilities:', {
    textToVideo: capabilities.supportsTextToVideo,
    imageToVideo: capabilities.supportsImageToVideo,
    textToVideoPath: capabilities.textToVideoPath,
    imageToVideoPath: capabilities.imageToVideoPath,
  });
  
  // 2. Determine operation based on inputs
  const operation = userInputs.image ? 'image2video' : 'text2video';
  
  // 3. Build request body with automatic parameter mapping
  const request = buildRequestBody(operation, capabilities, userInputs, chuteUrl);
  
  if (!request) {
    throw new Error('Could not build request for this operation');
  }
  
  console.log('Generated request:', {
    endpoint: request.endpoint,
    body: request.body,
  });
  
  // 4. Send request
  const response = await fetch(`${chuteUrl}${request.endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request.body),
  });
  
  return response.json();
}

// Example: Works with ANY video chute without changes
const result = await generateVideo(
  'https://chutes-lightricks-ltx-video.chutes.ai',
  'your-api-key',
  {
    prompt: 'A cat playing piano',
    resolution: '1280*720',
    steps: 30,
  }
);
```

**What happens automatically:**

1. Fetches OpenAPI schema from LTX chute
2. Discovers it uses `/generate` endpoint with `width`/`height` (not `resolution`)
3. Converts `1280*720` → `{ width: 1280, height: 720 }`
4. Rounds to multiples of 64 (LTX requirement): `{ width: 1280, height: 704 }`
5. Maps `steps` → `num_inference_steps` (what LTX expects)
6. Builds correct request automatically

### Example 2: Image Editing with Multiple Models (TypeScript)

```typescript
async function editImage(
  chuteUrl: string,
  apiKey: string,
  prompt: string,
  images: string[],  // Base64 images
  width: number = 1024,
  height: number = 1024,
) {
  // Discover capabilities
  const capabilities = await discoverChuteCapabilities(chuteUrl, apiKey);
  
  // Build request (handles different parameter formats automatically)
  const request = buildRequestBody(
    'edit',
    capabilities,
    {
      prompt,
      images,
      width,
      height,
    },
    chuteUrl
  );
  
  console.log('Auto-adapted request:', request);
  
  const response = await fetch(`${chuteUrl}${request.endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request.body),
  });
  
  return response.json();
}

// Works with Qwen Image Edit (expects image_b64s array)
await editImage(
  'https://chutes-qwen-image-edit.chutes.ai',
  'api-key',
  'Make the sky purple',
  ['data:image/png;base64,...'],
  1024,
  1024
);

// Also works with DALL-E style endpoints (expects size string)
await editImage(
  'https://some-dalle-compatible-chute.chutes.ai',
  'api-key',
  'Add a rainbow',
  ['data:image/png;base64,...'],
  1024,
  1024
);
```

**Automatic adaptations:**

- **Qwen chute:** `images` → `image_b64s`, keeps `width`/`height`
- **DALL-E chute:** `images[0]` → `image`, `width+height` → `size: "1024x1024"`

## Python Implementation

Here's how to build the same system in Python:

### Full Discovery System

```python
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class EndpointInfo:
    """Discovered endpoint information"""
    path: str
    method: str
    parameters: List[Dict[str, Any]]

@dataclass
class ChuteCapabilities:
    """What a chute can do"""
    endpoints: List[EndpointInfo]
    supports_text_to_video: bool
    supports_image_to_video: bool
    supports_image_edit: bool
    text_to_video_path: Optional[str]
    image_to_video_path: Optional[str]
    image_edit_path: Optional[str]

class SchemaCache:
    """Cache OpenAPI schemas with TTL"""
    def __init__(self, ttl_seconds: int = 3600):
        self._cache: Dict[str, tuple[Dict, datetime]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)
    
    def get(self, key: str) -> Optional[Dict]:
        if key in self._cache:
            schema, timestamp = self._cache[key]
            if datetime.now() - timestamp < self._ttl:
                return schema
            del self._cache[key]
        return None
    
    def set(self, key: str, schema: Dict):
        self._cache[key] = (schema, datetime.now())

# Global cache instance
_schema_cache = SchemaCache(ttl_seconds=3600)

def discover_chute_capabilities(
    chute_base_url: str,
    api_key: str
) -> ChuteCapabilities:
    """
    Automatically discover what a chute can do by fetching and parsing
    its OpenAPI schema
    """
    schema = None
    
    # Check cache first
    cached = _schema_cache.get(chute_base_url)
    if cached:
        schema = cached
        print(f"[Cache] Using cached schema for {chute_base_url}")
    else:
        # Fetch schema from chute
        schema_url = f"{chute_base_url}/openapi.json"
        print(f"[OpenAPI] Fetching schema from: {schema_url}")
        
        try:
            response = requests.get(
                schema_url,
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.ok:
                schema = response.json()
                _schema_cache.set(chute_base_url, schema)
                print(f"[OpenAPI] Successfully fetched schema")
            else:
                print(f"[OpenAPI] Failed to fetch schema: {response.status_code}")
        except Exception as e:
            print(f"[OpenAPI] Error fetching schema: {e}")
    
    # Initialize capabilities
    capabilities = ChuteCapabilities(
        endpoints=[],
        supports_text_to_video=False,
        supports_image_to_video=False,
        supports_image_edit=False,
        text_to_video_path=None,
        image_to_video_path=None,
        image_edit_path=None,
    )
    
    # Parse schema if available
    if schema and 'paths' in schema:
        paths = schema['paths']
        print(f"[OpenAPI] Found {len(paths)} paths in schema")
        
        # Check for broken schemas
        if any('{path}' in p or p.startswith('{') for p in paths.keys()):
            print(f"[OpenAPI] Detected broken schema, using fallback")
        else:
            for path, path_item in paths.items():
                for method in ['post', 'put']:
                    if method not in path_item:
                        continue
                    
                    operation = path_item[method]
                    parameters = []
                    
                    # Extract parameters from requestBody
                    if 'requestBody' in operation:
                        request_body = operation['requestBody']
                        if 'content' in request_body:
                            content = request_body['content']
                            if 'application/json' in content:
                                json_content = content['application/json']
                                if 'schema' in json_content:
                                    schema_obj = json_content['schema']
                                    if 'properties' in schema_obj:
                                        properties = schema_obj['properties']
                                        required = schema_obj.get('required', [])
                                        
                                        for param_name, param_schema in properties.items():
                                            # Handle input_args wrapper
                                            if (param_name == 'input_args' and 
                                                param_schema.get('type') == 'object' and 
                                                'properties' in param_schema):
                                                nested_props = param_schema['properties']
                                                nested_required = param_schema.get('required', [])
                                                
                                                for nested_name, nested_schema in nested_props.items():
                                                    parameters.append({
                                                        'name': nested_name,
                                                        'required': nested_name in nested_required,
                                                        'type': nested_schema.get('type', 'string'),
                                                    })
                                            else:
                                                parameters.append({
                                                    'name': param_name,
                                                    'required': param_name in required,
                                                    'type': param_schema.get('type', 'string'),
                                                })
                    
                    # Add endpoint
                    capabilities.endpoints.append(EndpointInfo(
                        path=path,
                        method=method.upper(),
                        parameters=parameters,
                    ))
                    
                    # Infer capabilities from parameters
                    param_names = [p['name'] for p in parameters]
                    has_prompt = any(n in param_names for n in ['prompt', 'text'])
                    has_image = any(n in param_names for n in ['image', 'image_b64', 'image_url'])
                    has_image_array = any(
                        p['name'] == 'image_b64s' and p['type'] == 'array' 
                        for p in parameters
                    )
                    
                    # Text-to-video
                    if path == '/text2video' or (has_prompt and not has_image):
                        print(f"[OpenAPI] Detected TEXT-TO-VIDEO at {path}")
                        capabilities.supports_text_to_video = True
                        capabilities.text_to_video_path = path
                    
                    # Image-to-video
                    if path == '/image2video' or (has_prompt and has_image):
                        print(f"[OpenAPI] Detected IMAGE-TO-VIDEO at {path}")
                        capabilities.supports_image_to_video = True
                        capabilities.image_to_video_path = path
                    
                    # Image editing
                    if (path == '/edit' or 
                        path == '/v1/images/edits' or
                        (path == '/generate' and has_prompt and has_image_array)):
                        print(f"[OpenAPI] Detected IMAGE-EDIT at {path}")
                        capabilities.supports_image_edit = True
                        capabilities.image_edit_path = path
    
    # Fallback logic
    if len(capabilities.endpoints) == 0:
        print(f"[OpenAPI] No endpoints found, adding fallback /generate")
        capabilities.endpoints.append(EndpointInfo(
            path='/generate',
            method='POST',
            parameters=[
                {'name': 'prompt', 'required': True, 'type': 'string'},
                {'name': 'image', 'required': False, 'type': 'string'},
                {'name': 'image_b64', 'required': False, 'type': 'string'},
                {'name': 'image_b64s', 'required': False, 'type': 'array'},
                {'name': 'width', 'required': False, 'type': 'integer'},
                {'name': 'height', 'required': False, 'type': 'integer'},
                {'name': 'num_inference_steps', 'required': False, 'type': 'integer'},
            ],
        ))
    
    # Always assume support if uncertain
    if not capabilities.supports_text_to_video and not capabilities.supports_image_to_video:
        capabilities.supports_text_to_video = True
        capabilities.supports_image_to_video = True
    
    # Set default paths
    if not capabilities.text_to_video_path:
        capabilities.text_to_video_path = '/generate'
    if not capabilities.image_to_video_path:
        capabilities.image_to_video_path = '/generate'
    if not capabilities.image_edit_path:
        capabilities.image_edit_path = '/edit'
    
    return capabilities

def build_request_body(
    operation: str,
    capabilities: ChuteCapabilities,
    user_inputs: Dict[str, Any],
    chute_url: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Build request body dynamically based on discovered capabilities
    and user inputs, with automatic parameter mapping
    """
    # Find appropriate endpoint
    target_endpoint = None
    
    if operation == 'text2video':
        if capabilities.text_to_video_path:
            target_endpoint = next(
                (e for e in capabilities.endpoints if e.path == capabilities.text_to_video_path),
                None
            )
    elif operation == 'image2video':
        if capabilities.image_to_video_path:
            target_endpoint = next(
                (e for e in capabilities.endpoints if e.path == capabilities.image_to_video_path),
                None
            )
    elif operation in ['edit', 'image_edit']:
        if capabilities.image_edit_path:
            target_endpoint = next(
                (e for e in capabilities.endpoints if e.path == capabilities.image_edit_path),
                None
            )
    
    # Fallback to /generate
    if not target_endpoint:
        fallback_path = '/generate'
        if operation == 'text2video':
            fallback_path = '/text2video'
        elif operation in ['edit', 'image_edit']:
            fallback_path = '/edit'
        
        print(f"[OpenAPI] Using fallback endpoint: {fallback_path}")
        return {
            'endpoint': fallback_path,
            'body': {**user_inputs},
        }
    
    # Build parameter map
    endpoint_params = {p['name']: p for p in target_endpoint.parameters}
    
    # Clone user inputs
    modified_inputs = {**user_inputs}
    
    # Convert resolution string to width/height if needed
    if 'resolution' in modified_inputs and isinstance(modified_inputs['resolution'], str):
        if ('width' in endpoint_params or 'height' in endpoint_params) and 'resolution' not in endpoint_params:
            parts = modified_inputs['resolution'].split('*')
            if len(parts) == 2:
                width = int(parts[0])
                height = int(parts[1])
                
                # LTX-2: round to multiples of 64
                if chute_url and 'ltx' in chute_url.lower():
                    width = round(width / 64) * 64
                    height = round(height / 64) * 64
                    print(f"[OpenAPI] LTX detected: rounded to {width}x{height}")
                
                modified_inputs['width'] = width
                modified_inputs['height'] = height
                del modified_inputs['resolution']
    
    # Convert width/height to size string if needed
    if 'width' in modified_inputs and 'height' in modified_inputs and 'size' in endpoint_params:
        modified_inputs['size'] = f"{modified_inputs['width']}x{modified_inputs['height']}"
        if 'width' not in endpoint_params:
            del modified_inputs['width']
        if 'height' not in endpoint_params:
            del modified_inputs['height']
    
    # Handle image array conversion for image editing
    is_image_edit = operation in ['edit', 'image_edit']
    if is_image_edit and 'images' in modified_inputs and isinstance(modified_inputs['images'], list):
        if 'image_b64s' in endpoint_params:
            modified_inputs['image_b64s'] = modified_inputs['images']
            del modified_inputs['images']
        elif 'image' in endpoint_params or 'image_b64' in endpoint_params:
            modified_inputs['image'] = modified_inputs['images'][0]
            del modified_inputs['images']
    
    # Parameter alias mapping
    parameter_mappings = {
        'prompt': ['prompt', 'text', 'description'],
        'image': ['image', 'image_b64', 'image_url', 'input_image'],
        'image_b64s': ['image_b64s'],
        'steps': ['steps', 'num_inference_steps', 'sampling_steps'],
        'fps': ['fps', 'frame_rate', 'frames_per_second'],
        'frames': ['frames', 'num_frames', 'frame_num'],
        'guidance_scale': ['cfg_guidance_scale', 'guidance_scale', 'true_cfg_scale'],
        'negative_prompt': ['negative_prompt', 'neg_prompt'],
    }
    
    # Build request body with parameter mapping
    request_body = {}
    
    for user_key, user_value in modified_inputs.items():
        mapped = False
        
        # Try direct mapping
        if user_key in endpoint_params:
            request_body[user_key] = user_value
            mapped = True
        else:
            # Try aliases
            if user_key in parameter_mappings:
                for alias in parameter_mappings[user_key]:
                    if alias in endpoint_params:
                        request_body[alias] = user_value
                        mapped = True
                        break
        
        # Include unmapped parameters for custom endpoints (best effort)
        if not mapped and not target_endpoint.path.startswith('/v1/'):
            request_body[user_key] = user_value
    
    return {
        'endpoint': target_endpoint.path,
        'body': request_body,
    }

# Example usage
if __name__ == "__main__":
    chute_url = "https://chutes-lightricks-ltx-video.chutes.ai"
    api_key = "your-api-key"
    
    # Discover capabilities
    capabilities = discover_chute_capabilities(chute_url, api_key)
    
    print("\nDiscovered Capabilities:")
    print(f"  Text-to-Video: {capabilities.supports_text_to_video} ({capabilities.text_to_video_path})")
    print(f"  Image-to-Video: {capabilities.supports_image_to_video} ({capabilities.image_to_video_path})")
    print(f"  Image Edit: {capabilities.supports_image_edit} ({capabilities.image_edit_path})")
    print(f"  Total Endpoints: {len(capabilities.endpoints)}")
    
    # Build request
    user_inputs = {
        'prompt': 'A cat playing piano',
        'resolution': '1280*720',
        'steps': 30,
        'guidance_scale': 3.5,
    }
    
    request = build_request_body('text2video', capabilities, user_inputs, chute_url)
    
    print("\nGenerated Request:")
    print(f"  Endpoint: {request['endpoint']}")
    print(f"  Body: {request['body']}")
    
    # Send request
    response = requests.post(
        f"{chute_url}{request['endpoint']}",
        json=request['body'],
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
    )
    
    print(f"\nResponse: {response.status_code}")
    if response.ok:
        print(response.json())
```

### Simplified Python Example

Here's a minimal version showing just the core discovery logic:

```python
import requests
from typing import Dict, List, Optional

def simple_discover(chute_url: str, api_key: str) -> Dict:
    """Simplified discovery - just fetch and parse"""
    # 1. Fetch OpenAPI schema
    response = requests.get(
        f"{chute_url}/openapi.json",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    
    if not response.ok:
        return {'error': 'Could not fetch schema'}
    
    schema = response.json()
    
    # 2. Extract endpoints and parameters
    endpoints = []
    for path, path_item in schema.get('paths', {}).items():
        for method in ['post', 'put']:
            if method not in path_item:
                continue
            
            operation = path_item[method]
            params = []
            
            # Navigate: requestBody -> content -> application/json -> schema -> properties
            try:
                properties = (
                    operation
                    .get('requestBody', {})
                    .get('content', {})
                    .get('application/json', {})
                    .get('schema', {})
                    .get('properties', {})
                )
                
                for param_name, param_schema in properties.items():
                    params.append({
                        'name': param_name,
                        'type': param_schema.get('type', 'string'),
                    })
            except:
                pass
            
            endpoints.append({
                'path': path,
                'method': method.upper(),
                'parameters': params,
            })
    
    # 3. Infer capabilities
    capabilities = {
        'text_to_video': False,
        'image_to_video': False,
    }
    
    for endpoint in endpoints:
        param_names = [p['name'] for p in endpoint['parameters']]
        has_prompt = 'prompt' in param_names or 'text' in param_names
        has_image = 'image' in param_names or 'image_b64' in param_names
        
        if has_prompt and not has_image:
            capabilities['text_to_video'] = True
        if has_prompt and has_image:
            capabilities['image_to_video'] = True
    
    return {
        'endpoints': endpoints,
        'capabilities': capabilities,
    }

# Usage
result = simple_discover(
    "https://chutes-lightricks-ltx-video.chutes.ai",
    "your-api-key"
)

print("Discovered:")
print(f"  Can do text-to-video: {result['capabilities']['text_to_video']}")
print(f"  Can do image-to-video: {result['capabilities']['image_to_video']}")
print(f"  Available endpoints: {[e['path'] for e in result['endpoints']]}")
```

## Key Insights

### 1. **Schema-First, Hardcoding Never**

The system never hardcodes model-specific logic. Everything is discovered at runtime from OpenAPI schemas.

### 2. **Graceful Degradation**

When schemas are missing or broken, the system falls back to sensible defaults based on common patterns.

### 3. **Smart Type Inference**

Instead of asking "what model is this?", we ask "what parameters does it accept?" and infer capabilities from that.

### 4. **Automatic Translation**

Parameter names vary across models. We automatically map between different conventions (`prompt` → `text`, `steps` → `num_inference_steps`, etc.).

### 5. **Format Normalization**

Different APIs expect different formats. We detect and convert automatically (`resolution` → `width/height`, `width+height` → `size`, singular → array, etc.).

## Benefits

### For Users
- ✅ Don't need to know each model's quirks
- ✅ Same interface works across all chutes
- ✅ New models work immediately without updates

### For Developers
- ✅ Zero maintenance when models change
- ✅ No model-specific code paths
- ✅ Works with models that don't exist yet

### For the Platform
- ✅ New chutes automatically supported
- ✅ API changes don't break integrations
- ✅ Scales to hundreds of models

## Testing the System

To test discovery on a real chute:

```typescript
// TypeScript
import { discoverChuteCapabilities } from './openApiDiscovery';

const chute = 'https://chutes-lightricks-ltx-video.chutes.ai';
const capabilities = await discoverChuteCapabilities(chute, 'YOUR_API_KEY');

console.log('Discovered:', {
  endpoints: capabilities.endpoints.map(e => e.path),
  textToVideo: capabilities.supportsTextToVideo,
  imageToVideo: capabilities.supportsImageToVideo,
});
```

```python
# Python
from discovery import discover_chute_capabilities

chute = 'https://chutes-lightricks-ltx-video.chutes.ai'
capabilities = discover_chute_capabilities(chute, 'YOUR_API_KEY')

print('Discovered:', {
    'endpoints': [e.path for e in capabilities.endpoints],
    'text_to_video': capabilities.supports_text_to_video,
    'image_to_video': capabilities.supports_image_to_video,
})
```

## Common Patterns

### Pattern 1: Unified `/generate` Endpoint

**Modern chutes** (Wan 2.2, LTX-2) use a single `/generate` endpoint for all operations:

```json
{
  "paths": {
    "/generate": {
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "prompt": { "type": "string" },
                  "image": { "type": "string" },
                  "width": { "type": "integer" },
                  "height": { "type": "integer" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Discovery infers:** Supports both text-to-video (prompt only) and image-to-video (prompt + image).

### Pattern 2: Separate Endpoints

**Older chutes** (Wan 2.1) use separate endpoints:

```json
{
  "paths": {
    "/text2video": {
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "prompt": { "type": "string" }
                }
              }
            }
          }
        }
      }
    },
    "/image2video": {
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "prompt": { "type": "string" },
                  "image_b64": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Discovery detects:** Explicit paths for each operation type.

### Pattern 3: OpenAI-Compatible

**DALL-E style chutes** use OpenAI's format:

```json
{
  "paths": {
    "/v1/images/edits": {
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "prompt": { "type": "string" },
                  "image": { "type": "string" },
                  "size": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Discovery adapts:** Converts `width/height` → `size: "1024x1024"`.

### Pattern 4: Wrapped Parameters

**Some chutes** wrap parameters in `input_args`:

```json
{
  "properties": {
    "input_args": {
      "type": "object",
      "properties": {
        "prompt": { "type": "string" },
        "image_b64s": { "type": "array" }
      }
    }
  }
}
```

**Discovery unwraps:** Extracts nested parameters automatically.

## Advanced: Building Your Own Discovery System

If you want to build a similar system for a different platform:

### 1. Define What You Need to Discover

```typescript
interface DiscoveredCapabilities {
  // What can this endpoint do?
  operations: string[];  // ['text2image', 'image2image', 'inpainting']
  
  // How do I call it?
  endpoints: Array<{
    path: string;
    method: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
    }>;
  }>;
  
  // What formats does it expect?
  inputFormat: 'base64' | 'url' | 'binary';
  outputFormat: 'base64' | 'url';
}
```

### 2. Fetch Schema

```typescript
async function fetchSchema(baseUrl: string): Promise<any> {
  // Try OpenAPI first
  try {
    const response = await fetch(`${baseUrl}/openapi.json`);
    if (response.ok) return await response.json();
  } catch {}
  
  // Try Swagger
  try {
    const response = await fetch(`${baseUrl}/swagger.json`);
    if (response.ok) return await response.json();
  } catch {}
  
  // Try API documentation endpoint
  try {
    const response = await fetch(`${baseUrl}/api/docs`);
    if (response.ok) return await response.json();
  } catch {}
  
  return null;
}
```

### 3. Parse with Fallbacks

```typescript
function parseSchema(schema: any): DiscoveredCapabilities {
  const capabilities = initializeDefaults();
  
  if (schema && schema.paths) {
    // Parse OpenAPI schema
    parseOpenAPI(schema, capabilities);
  } else if (schema && schema.apis) {
    // Parse Swagger 1.x
    parseSwagger(schema, capabilities);
  } else {
    // Use fallbacks
    applyCommonPatterns(capabilities);
  }
  
  return capabilities;
}
```

### 4. Infer from Patterns

```typescript
function inferCapabilities(parameters: Parameter[]): string[] {
  const ops = [];
  const names = parameters.map(p => p.name.toLowerCase());
  
  if (names.includes('prompt') || names.includes('text')) {
    if (names.includes('image') || names.includes('init_image')) {
      ops.push('image2image');
    } else {
      ops.push('text2image');
    }
  }
  
  if (names.includes('mask')) {
    ops.push('inpainting');
  }
  
  return ops;
}
```

### 5. Test Against Real APIs

Always test your discovery logic against real-world APIs with different patterns:

```typescript
const testCases = [
  { url: 'https://api-a.com', expected: ['text2image'] },
  { url: 'https://api-b.com', expected: ['text2image', 'image2image'] },
  { url: 'https://api-c.com', expected: ['inpainting'] },
];

for (const test of testCases) {
  const discovered = await discoverCapabilities(test.url);
  assert.deepEqual(discovered.operations, test.expected);
}
```

## Conclusion

The automatic chute discovery system is the core innovation that makes n8n-nodes-chutes maintainable at scale. By discovering capabilities at runtime instead of hardcoding model-specific logic, we built a system that:

- ✅ Works with any chute without code changes
- ✅ Adapts automatically when APIs change
- ✅ Scales to hundreds of models
- ✅ Requires zero maintenance

The key principles:
1. **Schema-first** - Let the API tell you what it can do
2. **Infer, don't hardcode** - Derive capabilities from parameter patterns
3. **Map automatically** - Translate between different naming conventions
4. **Fail gracefully** - Have sensible fallbacks when discovery fails

This architecture is what makes the integration actually useful in production. Without it, we'd be stuck maintaining hundreds of model-specific code paths. With it, new models just work.
