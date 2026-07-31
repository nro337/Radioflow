# Radioflow
BE645 AI in Radiomics Final Project

## Requirements
- Python 3.10
- uv
- Node.js version 24+
- Docker Desktop

## Getting Started

### Linking Your Local Dataset
It is assumed that you have a local dataset in a director with the two following subdirectories:
- images
- masks

> **Note:** Ensure you grant Docker Desktop access to the directory on your machine.

**MacOS**:
1. Open Docker Desktop
2. Go to Settings > Resources > File Sharing
3. Click "Add a Folder" and select the directory where you have stored the dataset
4. Click "Apply & Restart" to save the changes and restart Docker Desktop

**Windows WSL2**:
1. Open Docker Desktop
2. Go to Settings > Resources > WSL Integration
3. Add the drive letter where you have the Dataset
4. Click "Apply & Restart" to save the changes and restart Docker Desktop

Next, you need to update the `DATASET_PATH` variable in the `.env` file at the root of the repo to point to the directory where you have stored the Dataset. For example:
```bash
cp .env.example .env
```

Then edit `.env` and set:
```
DATASET_PATH=/path/to/dataset
```

### Start the Backend API
1. Navigate to the root of the repo:
    ```bash
    cd Radioflow
    ```
2. Build and run the Docker container:
    ```bash
    docker compose up --build -d backend
    ```
3. Confirm the container is running:
    ```bash
    docker compose ps
    ```
4. Check the API health endpoint:
    ```bash
    curl http://localhost:8000/health
    ``` 

### Starting the Backend API (image already built)
If you've already built the backend image and just need to start it again (no code changes since the last build), skip the `--build` step:
1. Navigate to the root of the repo:
    ```bash
    cd Radioflow
    ```
2. Start the existing container:
    ```bash
    docker compose up -d backend
    ```
3. Confirm the container is running:
    ```bash
    docker compose ps
    ```
4. Check the API health endpoint:
    ```bash
    curl http://localhost:8000/health
    ```

> **Tip:** If the container already exists but is stopped, `docker compose up -d backend` will just restart it without rebuilding. Only add `--build` back if you've changed backend code or dependencies.

### Stopping the Backend API
To stop the backend API, run:
```bash
docker compose down backend
```

### View API Documentation
View API documentation at:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)

## Starting the Frontend
1. cd into the frontend directory:
    ```bash
    cd frontend
    ```
2. `npm install` to install dependencies
3. `npm run dev` to start the development server
4. Open http://localhost:5173 in your browser to view the app

## Licensing and Attribution

The example dataset used for this project is sourced from Figshare as the [Brain Tumor Dataset](https://figshare.com/articles/dataset/brain_tumor_dataset/1512427). All credit and rights to the dataset are owned by the original authors, and it is used here solely for educational purposes in the context of this project. The dataset includes 3,064 T1-weighted contrast-enhanced MRI images from 233 patients, categorized into three types of brain tumors: meningioma (708 slices), glioma (1,426 slices), and pituitary tumor (930 slices).

The core Python code implementation have been sourced from Hossam Balaha and their curriculum development in the [BE 645 Artificial Intelligence (AI) and Radiomics](https://github.com/HossamBalaha/BE-645-Artificial-Intelligence-and-Radiomics) course. All original source code is the sole property of Hossam Balaha and the University of Louisville. The code has been adapted and extended for use in Radioflow, but the original contributions are acknowledged. As cited from the original repository:


> No part of this series may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the author, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law. For permission requests, contact the author.
