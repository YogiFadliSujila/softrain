# Face-API.js Models

Download the following model files from:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Required models for Softrain:
1. **tiny_face_detector** - For fast face detection
   - tiny_face_detector_model-weights_manifest.json
   - tiny_face_detector_model-shard1

2. **face_expression** - For expression recognition
   - face_expression_model-weights_manifest.json
   - face_expression_model-shard1

## Quick Download (PowerShell)

```powershell
cd public/models

# Tiny Face Detector
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json" -OutFile "tiny_face_detector_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1" -OutFile "tiny_face_detector_model-shard1"

# Face Expression
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json" -OutFile "face_expression_model-weights_manifest.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard1" -OutFile "face_expression_model-shard1"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard2" -OutFile "face_expression_model-shard2"
```
