"""
========================================================================
        ╦ ╦┌─┐┌─┐┌─┐┌─┐┌┬┐  ╔╦╗┌─┐┌─┐┌┬┐┬ ┬  ╔╗ ┌─┐┬  ┌─┐┬ ┬┌─┐
        ╠═╣│ │└─┐└─┐├─┤│││  ║║║├─┤│ ┬ ││└┬┘  ╠╩╗├─┤│  ├─┤├─┤├─┤
        ╩ ╩└─┘└─┘└─┘┴ ┴┴ ┴  ╩ ╩┴ ┴└─┘─┴┘ ┴   ╚═╝┴ ┴┴─┘┴ ┴┴ ┴┴ ┴
========================================================================
# Author: Hossam Magdy Balaha
# Permissions and Citation: Refer to the README file.
"""

# Import necessary libraries.
import json  # For saving the raw confusion matrix alongside its plot.
import os  # For file and directory operations.
import pickle  # For saving and loading Python objects.
from typing import Callable, Optional
from matplotlib import pyplot as plt
import numpy as np
import tqdm  # For progress bar in loops.
import pandas as pd

from app.utils.classification_utils import (
    MachineLearningClassificationV1,
)  # For data manipulation and analysis.

# from HMB_Summer_2026_Helpers import *

# Load the data from the specified CSV file.
# baseDir = "Data"  # Base directory.
# datasetFilename = r"COVID-19 Radiography Database (FirstOrderFeatures) Features.csv"
# storageFolderName = r"COVID-19 Radiography Database (FirstOrderFeatures) Features"

# Load the data from the specified CSV file.
# baseDir = "Data"  # Base directory.
# datasetFilename = r"COVID-19 Radiography Database (GLCM) Features.csv"
# storageFolderName = r"COVID-19 Radiography Database (GLCM) Features"

# Load the data from the specified CSV file.
# baseDir = "Data"  # Base directory.
# datasetFilename = r"COVID-19 Radiography Database (GLRLM) Features.csv"
# storageFolderName = r"COVID-19 Radiography Database (GLRLM) Features"

# Load the data from the specified CSV file.
# baseDir = "Data"  # Base directory.
# datasetFilename = r"COVID-19 Radiography Database (GLSZM) Features.csv"
# storageFolderName = r"COVID-19 Radiography Database (GLSZM) Features"

# Load the data from the specified CSV file.
baseDir = "Data"  # Base directory.
datasetFilename = r"MiniProject3 Radiography Database (FirstOrderFeatures-GLCM-GLRLM-GLSZM) Features.csv"
storageFolderName = (
    r"MiniProject3 Radiography Database (FirstOrderFeatures-GLCM-GLRLM-GLSZM) Features"
)

test_ratios = [0.1, 0.15, 0.2, 0.25, 0.3]  # List of test ratios to evaluate.

scalers = [
    "Normalizer",  # Normalizer
    "Standard",  # Standard Scaler
    "MinMax",  # Min-Max Scaler
    "Robust",  # Robust Scaler
    "MaxAbs",  # Max Absolution Scaler
    "QT",  # Quantile Transformer
]

models = [
    "MLP",  # Multi-Layer Perceptron
    "RF",  # Random Forest
    "AB",  # Adaptive Boosting
    "KNN",  # K-Nearest Neighbors
    "DT",  # Decision Tree
    "ETs",  # Extra Trees Classifier
    "SGD",  # Stochastic Gradient Descent
    # You can also use (check GetMLClassificationModelObject function):
    "SVC",  # Support Vector Classifier
    "GNB",  # Gaussian Naive Bayes
    "LR",  # Logistic Regression
    "GB",  # Gradient Boosting Classifier
    "Bagging",  # Bagging Classifier
    "XGB",  # eXtreme Gradient Boosting
    "LGBM",  # Light Gradient Boosting Machine
    "Voting",  # Voting Classifier
    "Stacking",  # Stacking Classifier
]


def run_classification_experiments(
    datasetFilename=datasetFilename,
    storageFolderName=storageFolderName,
    test_ratios=test_ratios,
    scalers=scalers,
    models=models,
    baseDir=baseDir,
    targetColumn="Class",
    dropFirstColumn=True,
    progressCallback: Optional[Callable[[int, int, str], None]] = None,
):
    """
    Sweep classification experiments over every combination of test ratio, scaler,
    and model, saving confusion matrix plots, trained model/scaler objects, and a
    per-test-ratio metrics history CSV.

    # Parameters:
    - datasetFilename (str): Dataset file name (CSV format), relative to `baseDir`.
    - storageFolderName (str): Folder name (under `baseDir`) to store results in.
    - test_ratios (list): List of test ratios to evaluate.
    - scalers (list): Scaler names understood by `GetScalerObject`.
    - models (list): Model names understood by `GetMLClassificationModelObject`.
    - baseDir (str): Base directory containing the dataset and used for storage.
    - targetColumn (str): Name of the target column in the dataset.
    - dropFirstColumn (bool): Whether to drop the first column (usually an index or ID).
    - progressCallback (Optional[Callable[[int, int, str], None]]): Called with
      (processedCount, totalCount, currentTaskName) after each model/scaler
      combination is evaluated, so callers can surface live progress (e.g. to a UI).
    # Returns:
    - str: The path to the storage folder containing one subfolder per test ratio.
    """

    totalTasks = len(test_ratios) * len(models) * len(scalers)
    processedTasks = 0

    for testRatio in tqdm.tqdm(test_ratios, desc="Test Ratios"):

        # Create the storage folder path if it does not exist.
        storageFolderPath = os.path.join(
            baseDir, storageFolderName, f"TestRatio_{testRatio}"
        )
        os.makedirs(
            storageFolderPath,
            exist_ok=True,  # Create the directory if it does not exist.
        )

        # Create a list to store the performance metrics of each model and scaler combination.
        history = []

        # Iterate through each model and scaler combination.
        for modelName in tqdm.tqdm(models, desc="Models"):
            for scalerName in tqdm.tqdm(scalers, desc="Scalers", leave=False):
                try:
                    # Call the function to perform machine learning classification.
                    metrics, pltObject, objects, confMatrix, classLabels = (
                        MachineLearningClassificationV1(
                            os.path.join(baseDir, datasetFilename),
                            scalerName,
                            modelName,
                            testRatio=testRatio,
                            targetColumn=targetColumn,
                            dropFirstColumn=dropFirstColumn,
                        )
                    )

                    # UNCOMMENT THE FOLLOWING CODE TO PRINT THE METRICS WITH 4 DECIMAL PLACES.
                    # Print the calculated metrics with 4 decimal places.
                    # for key, value in metrics.items():
                    #   print(f"{key}: {np.round(value, 4)}")

                    # Save the confusion matrix plot with a specific filename as a PNG image.
                    pltObject.figure.savefig(
                        os.path.join(
                            storageFolderPath, f"{modelName}_{scalerName}_CM.png"
                        ),
                        bbox_inches="tight",  # Adjust the bounding box to fit the plot.
                        dpi=720,  # Set the DPI for the saved image.
                    )

                    # pltObject.figure.show()  # Display the confusion matrix plot.
                    pltObject.figure.clf()  # Clear the figure to free up memory.
                    plt.close()  # Close the figure to free up memory.

                    # Save classes in JSON so UI can create the heatmap
                    with open(
                        os.path.join(
                            storageFolderPath, f"{modelName}_{scalerName}_CM.json"
                        ),
                        "w",
                    ) as f:
                        json.dump(
                            {"labels": classLabels, "matrix": confMatrix.tolist()}, f
                        )

                    # Save the trained model and scaler objects using pickle.
                    with open(
                        os.path.join(storageFolderPath, f"{modelName}_{scalerName}.p"),
                        "wb",  # Open the file in write-binary mode.
                    ) as f:
                        pickle.dump(objects, f)  # Save the model and scaler objects.

                    # "Weights" is a per-class proportion array not shown in the table.
                    countMetricKeys = {"TP", "FP", "FN", "TN"}
                    processedMetrics = {}
                    for key, value in metrics.items():
                        if isinstance(value, np.ndarray):
                            if key in countMetricKeys:
                                processedMetrics[key] = ", ".join(
                                    str(round(v)) for v in value.tolist()
                                )
                        else:
                            processedMetrics[key] = value

                    # Append the model name and scaler name to the metrics dictionary.
                    history.append(
                        {
                            "Model": modelName,  # Name of the machine learning model.
                            "Scaler": scalerName,  # Name of the scaler used for preprocessing.
                            **processedMetrics,  # Per-class counts + aggregate metrics.
                        }
                    )
                except Exception as e:
                    print(f"Error: {e}")

                # Report progress after each model/scaler combination, regardless of success.
                processedTasks += 1
                if progressCallback is not None:
                    progressCallback(
                        processedTasks,
                        totalTasks,
                        f"{modelName}_{scalerName}_TestRatio{testRatio}",
                    )

        # Save the performance metrics in a CSV file for future reference.
        df = pd.DataFrame(history)
        df.to_csv(
            os.path.join(storageFolderPath, "Metrics History.csv"),
            index=False,
        )

    print("Done! The experiment has been completed successfully.")

    return os.path.join(baseDir, storageFolderName)
