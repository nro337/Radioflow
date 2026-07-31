"""
========================================================================
        ╦ ╦┌─┐┌─┐┌─┐┌─┐┌┬┐  ╔╦╗┌─┐┌─┐┌┬┐┬ ┬  ╔╗ ┌─┐┬  ┌─┐┬ ┬┌─┐
        ╠═╣│ │└─┐└─┐├─┤│││  ║║║├─┤│ ┬ ││└┬┘  ╠╩╗├─┤│  ├─┤├─┤├─┤
        ╩ ╩└─┘└─┘└─┘┴ ┴┴ ┴  ╩ ╩┴ ┴└─┘─┴┘ ┴   ╚═╝┴ ┴┴─┘┴ ┴┴ ┴┴ ┴
========================================================================
# Author: Hossam Magdy Balaha & Nick Alico
# Permissions and Citation: Refer to the README file.
"""

# Import necessary libraries.
import os  # For file and directory operations.
import pickle  # For saving and loading Python objects.
from typing import Dict, Optional

import pandas as pd  # For data manipulation and analysis.
import numpy as np  # For numerical operations.


def run_prediction(
    resultsDir: str,
    model: str,
    scaler: str,
    featuresPath: str,
    targetColumn: str = "Class",
    dropFirstColumn: bool = True,
    fileColumn: str = "File",
) -> Dict:
    """
    Pick a random sample from the experiment's extracted features and classify it
    using an already-trained model/scaler combination.

    Args:
        resultsDir (str): Directory holding the trained `{model}_{scaler}.p` pickle
            for one test-ratio (i.e. `.../training/TestRatio_<ratio>`).
        model (str): Trained model name (matches a pickle produced during training).
        scaler (str): Trained scaler name (matches a pickle produced during training).
        featuresPath (str): Path to the experiment's extracted-features CSV.
        targetColumn (str): Name of the class column in the features CSV.
        dropFirstColumn (bool): Whether the first remaining column (after dropping
            the target) was dropped before scaling during training, and so must be
            dropped here too to keep the feature columns aligned.
        fileColumn (str): Name of the column identifying the source image file, if
            present, so callers can look up the corresponding image.

    Returns:
        Dict: sampleIndex, file (optional), trueClass, predictedClass, and
        probabilities (optional, only when the model supports predict_proba).
    """
    # Load the trained model and scaler from the pickle file.
    picklePath = os.path.join(resultsDir, f"{model}_{scaler}.p")
    with open(picklePath, "rb") as file:
        objects = pickle.load(file)

    modelObj = objects["Model"]
    scalerObj = objects["Scaler"]
    labelEncoder = objects["LabelEncoder"]

    # Load the dataset into a DataFrame and grab a random sample.
    df = pd.read_csv(featuresPath)
    rndIndex = int(np.random.randint(0, len(df)))
    sample = df.iloc[rndIndex]

    fileName = sample[fileColumn] if fileColumn in sample else None
    y = sample[targetColumn]  # True target value.

    X = sample.drop(targetColumn).values.reshape(1, -1)  # Features.

    # Check if the first column should be dropped, mirroring training-time preprocessing.
    # (The features CSV's first remaining column is the file identifier, e.g. "File".)
    if dropFirstColumn:
        X = X[:, 1:]

    # Scale the features using the scaler.
    xScaled = scalerObj.transform(X)

    # Predict the class using the model.
    yPred = modelObj.predict(xScaled)
    yPredDecoded = labelEncoder.inverse_transform(yPred)[0]

    # Predicted class probabilities, when the underlying model supports them.
    probabilities: Optional[Dict[str, float]] = None
    if hasattr(modelObj, "predict_proba"):
        try:
            proba = modelObj.predict_proba(xScaled)[0]
            classNames = labelEncoder.inverse_transform(modelObj.classes_)
            probabilities = {
                str(className): float(p) for className, p in zip(classNames, proba)
            }
        except Exception:
            probabilities = None

    return {
        "sampleIndex": rndIndex,
        "file": str(fileName) if fileName is not None else None,
        "trueClass": str(y),
        "predictedClass": str(yPredDecoded),
        "probabilities": probabilities,
    }
