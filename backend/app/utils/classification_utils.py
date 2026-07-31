from matplotlib import pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


def GetMLClassificationModelObject(modelName, hyperparameters={}):
    """
    Get the machine learning classification model object based on the given name.

    Parameters:
        modelName (str): Name of the model.

    Returns:
        model (object): Model object.
    """
    if modelName == "MLP":
        from sklearn.neural_network import MLPClassifier

        return MLPClassifier(**hyperparameters)
    elif modelName == "RF":
        from sklearn.ensemble import RandomForestClassifier

        return RandomForestClassifier(**hyperparameters)
    elif modelName == "AB":
        from sklearn.ensemble import AdaBoostClassifier

        return AdaBoostClassifier(**hyperparameters)
    elif modelName == "KNN":
        from sklearn.neighbors import KNeighborsClassifier

        return KNeighborsClassifier(**hyperparameters)
    elif modelName == "DT":
        from sklearn.tree import DecisionTreeClassifier

        return DecisionTreeClassifier(**hyperparameters)
    elif modelName == "SVC":
        from sklearn.svm import SVC

        return SVC(**hyperparameters)
    elif modelName == "GNB":
        from sklearn.naive_bayes import GaussianNB

        return GaussianNB(**hyperparameters)
    elif modelName == "LR":
        from sklearn.linear_model import LogisticRegression

        return LogisticRegression(**hyperparameters)
    elif modelName == "SGD":
        from sklearn.linear_model import SGDClassifier

        return SGDClassifier(**hyperparameters)
    elif modelName == "GB":
        from sklearn.ensemble import GradientBoostingClassifier

        return GradientBoostingClassifier(**hyperparameters)
    elif modelName == "Bagging":
        from sklearn.ensemble import BaggingClassifier

        return BaggingClassifier(**hyperparameters)
    elif modelName == "ETs":
        from sklearn.ensemble import ExtraTreesClassifier

        return ExtraTreesClassifier(**hyperparameters)
    elif modelName == "XGB":
        from xgboost import XGBClassifier

        return XGBClassifier(**hyperparameters)
    elif modelName == "LGBM":
        from lightgbm import LGBMClassifier

        return LGBMClassifier(**hyperparameters)
    elif modelName == "Voting":
        from sklearn.ensemble import VotingClassifier
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.tree import DecisionTreeClassifier

        estimators = [
            RandomForestClassifier(),
            DecisionTreeClassifier(),
        ]
        return VotingClassifier(estimators, **hyperparameters)
    elif modelName == "Stacking":
        from sklearn.ensemble import StackingClassifier
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.tree import DecisionTreeClassifier

        estimators = [
            RandomForestClassifier(),
            DecisionTreeClassifier(),
        ]
        return StackingClassifier(estimators, **hyperparameters)
    # You can add more models as needed.
    else:
        raise ValueError("Invalid model name.")


def GetScalerObject(scalerName):
    """
    Get the scaler object based on the given name.

    Parameters:
        scalerName (str): Name of the scaler.

    Returns:
        scaler (object): Scaler object.
    """
    if scalerName == "Standard":
        from sklearn.preprocessing import StandardScaler

        return StandardScaler()
    elif scalerName == "MinMax":
        from sklearn.preprocessing import MinMaxScaler

        return MinMaxScaler()
    elif scalerName == "Robust":
        from sklearn.preprocessing import RobustScaler

        return RobustScaler()
    elif scalerName == "MaxAbs":
        from sklearn.preprocessing import MaxAbsScaler

        return MaxAbsScaler()
    elif scalerName == "QT":
        from sklearn.preprocessing import QuantileTransformer

        return QuantileTransformer()
    elif scalerName == "Normalizer":
        from sklearn.preprocessing import Normalizer

        return Normalizer()
    # You can add more scalers as needed.
    else:
        raise ValueError(f"Invalid scaler name: {scalerName}.")


def CalculatePerformanceMetrics(
    confMatrix,
    eps=1e-10,
    addWeightedAverage=False,
):
    """
    Calculate performance metrics from a confusion matrix.

    Parameters:
    confMatrix (list of list): Confusion matrix as a nested list.
    eps (float): Small value to avoid division by zero.
    addWeightedAverage (bool): Whether to include weighted averages in the output.

    Returns:
    dict: A dictionary containing performance metrics including:
          - True Positives (TP)
          - False Positives (FP)
          - False Negatives (FN)
          - True Negatives (TN)
          - Macro Precision
          - Macro Recall
          - Macro F1
          - Macro Accuracy
          - Macro Specificity
          - Micro Precision
          - Micro Recall
          - Micro F1
          - Micro Accuracy
          - Micro Specificity
          - Weights
          - Weighted Precision
          - Weighted Recall
          - Weighted F1
          - Weighted Accuracy
          - Weighted Specificity
    """
    # Convert the confusion matrix to a NumPy array for easier manipulation.
    confMatrix = np.array(confMatrix)

    # Check if the confusion matrix is for binary classification.
    noOfClasses = confMatrix.shape[0]
    if noOfClasses > 2:
        # Calculate True Positives (TP) as the diagonal elements of the confusion matrix.
        TP = np.diag(confMatrix)
        # Calculate False Positives (FP) as the sum of each column minus the TP.
        FP = np.sum(confMatrix, axis=0) - TP
        # Calculate False Negatives (FN) as the sum of each row minus the TP.
        FN = np.sum(confMatrix, axis=1) - TP
        # Calculate True Negatives (TN) as the total sum of the matrix minus TP, FP, and FN.
        TN = np.sum(confMatrix) - (TP + FP + FN)
    else:
        # For binary classification, the confusion matrix is a 2x2 matrix.
        # Unravel the confusion matrix to get the TP, FP, FN, and TN.
        # The order of the elements is TN, FP, FN, TP.
        TN, FP, FN, TP = confMatrix.ravel()

    # Avoid division by zero by adding a small epsilon value.
    TP = TP + eps
    FP = FP + eps
    FN = FN + eps
    TN = TN + eps

    # Create a dictionary to hold the calculated performance metrics and
    # the TP, FP, FN, TN vectors.
    metrics = {
        "TP": TP,
        "FP": FP,
        "FN": FN,
        "TN": TN,
    }

    # Calculate precision using macro averaging: mean of TP / (TP + FP) for each class.
    precision = np.mean(TP / (TP + FP))
    # Calculate recall using macro averaging: mean of TP / (TP + FN) for each class.
    recall = np.mean(TP / (TP + FN))
    # Calculate F1 score using macro averaging: harmonic mean of precision and recall.
    f1 = 2 * precision * recall / (precision + recall)
    # Calculate accuracy using macro averaging: sum of TP and TN divided by the total sum of the matrix.
    accuracy = np.mean(TP + TN) / np.sum(confMatrix)
    # Calculate specificity using macro averaging: mean of TN / (TN + FP) for each class.
    specificity = np.mean(TN / (TN + FP))

    metrics.update(
        {
            "Macro Precision": precision,
            "Macro Recall": recall,
            "Macro F1": f1,
            "Macro Accuracy": accuracy,
            "Macro Specificity": specificity,
        }
    )

    # If requested, calculate the macro average of the metrics.
    if addWeightedAverage:
        avg = (precision + recall + f1 + accuracy + specificity) / 5.0
        metrics.update(
            {
                "Macro Average": avg,
            }
        )

    # Calculate precision using micro averaging: sum of TP divided by the sum of TP and FP.
    precision = np.sum(TP) / np.sum(TP + FP)
    # Calculate recall using micro averaging: sum of TP divided by the sum of TP and FN.
    recall = np.sum(TP) / np.sum(TP + FN)
    # Calculate F1 score using micro averaging: harmonic mean of precision and recall.
    f1 = 2 * precision * recall / (precision + recall)
    # Calculate accuracy using micro averaging: sum of TP and TN divided by TP, TN, FP, and FN.
    accuracy = np.sum(TP + TN) / np.sum(TP + TN + FP + FN)
    # Calculate specificity using micro averaging: sum of TN divided by the sum of TN and FP.
    specificity = np.sum(TN) / np.sum(TN + FP)

    metrics.update(
        {
            "Micro Precision": precision,
            "Micro Recall": recall,
            "Micro F1": f1,
            "Micro Accuracy": accuracy,
            "Micro Specificity": specificity,
        }
    )

    # If requested, calculate the micro average of the metrics.
    if addWeightedAverage:
        avg = (precision + recall + f1 + accuracy + specificity) / 5.0
        metrics.update(
            {
                "Micro Average": avg,
            }
        )

    # Calculate the number of samples per class by summing the rows of the confusion matrix.
    samples = np.sum(confMatrix, axis=1)

    # Calculate the weights for each class as the proportion of samples in that class.
    weights = samples / np.sum(confMatrix)

    # Calculate precision using weighted averaging: sum of precision per class multiplied by weights.
    precision = np.sum(TP / (TP + FP) * weights)
    # Calculate recall using weighted averaging: sum of recall per class multiplied by weights.
    recall = np.sum(TP / (TP + FN) * weights)
    # Calculate F1 score using weighted averaging: harmonic mean of weighted precision and recall.
    f1 = 2 * precision * recall / (precision + recall)
    # Calculate accuracy using weighted averaging: sum of TP and TN divided by the total sum of the matrix.
    accuracy = np.sum((TP + TN) * weights) / np.sum(confMatrix)
    # Calculate specificity using weighted averaging: sum of specificity per class multiplied by weights.
    specificity = np.sum(TN / (TN + FP) * weights)

    metrics.update(
        {
            "Weights": weights,
            "Weighted Precision": precision,
            "Weighted Recall": recall,
            "Weighted F1": f1,
            "Weighted Accuracy": accuracy,
            "Weighted Specificity": specificity,
        }
    )

    # If requested, calculate the weighted average of the metrics.
    if addWeightedAverage:
        avg = (precision + recall + f1 + accuracy + specificity) / 5.0
        metrics.update(
            {
                "Weighted Average": avg,
            }
        )

    return metrics


def MachineLearningClassificationV1(
    datasetFilePath,  # Dataset file name (CSV format).
    scalerName,  # Name of the scaler to use.
    modelName,  # Name of the machine learning classification model.
    testRatio=0.2,  # Ratio of the test data.
    targetColumn="Class",  # Name of the target column in the dataset.
    dropFirstColumn=True,  # Whether to drop the first column (usually an index or ID).
):
    """
    Perform machine learning classification on the given dataset.

    Parameters:
        datasetFilePath (str): Dataset file name (CSV format).
        scalerName (str): Name of the scaler to use.
        modelName (str): Name of the machine learning classification model.
        testRatio (float): Ratio of the test data.
        targetColumn (str): Name of the target column in the dataset.
        dropFirstColumn (bool): Whether to drop the first column (usually an index or ID).

    Returns:
        metrics (dict): Dictionary containing the calculated performance metrics.
    """

    # Read the CSV file into a pandas DataFrame.
    data = pd.read_csv(datasetFilePath)

    # Check if dropFirstColumn is True, then drop the first column.
    if dropFirstColumn:
        # Drop the first column if it is not the target column.
        if data.columns[0] != targetColumn:
            data = data.drop(data.columns[0], axis=1)

    # Interpolate missing values in the DataFrame using linear interpolation.
    # method: "linear" means linear interpolation,
    # limit_direction: "forward" means to fill missing values forward,
    # axis=0 means to interpolate along the columns.
    data = data.interpolate(method="linear", limit_direction="forward", axis=0)

    # Features (X) are all columns except the "Class" column.
    X = data.drop(targetColumn, axis=1)
    currentColumns = X.columns  # Store the current columns for later use.

    # Target (y) is the "Class" column.
    y = data[targetColumn]

    # Encode the target labels into numerical values using LabelEncoder.
    le = LabelEncoder()
    yEnc = le.fit_transform(y)
    _labels = le.classes_

    # Split the data into training and testing sets.
    xTrain, xTest, yTrain, yTest = train_test_split(
        X,
        yEnc,
        test_size=testRatio,
        random_state=np.random.randint(0, 1000),
        stratify=yEnc,
    )

    # Create a scaler object to scale the features.
    scaler = GetScalerObject(scalerName)

    # Fit the scaler on the training data and transform it.
    xTrain = scaler.fit_transform(xTrain)

    # Transform the test data using the fitted scaler.
    xTest = scaler.transform(xTest)

    # Train a model on the training data.
    model = GetMLClassificationModelObject(modelName)
    model.fit(xTrain, yTrain)

    # Evaluate the model by making predictions on the test data.
    predTest = model.predict(xTest)

    # Calculate the confusion matrix using the true and predicted labels.
    cm = confusion_matrix(yTest, predTest)

    # Calculate performance metrics.
    metrics = CalculatePerformanceMetrics(
        cm,  # Pass the confusion matrix.
        eps=1e-10,  # Small value to avoid division by zero.
        addWeightedAverage=True,  # Whether to include weighted averages in the output.
    )

    # Display the confusion matrix using ConfusionMatrixDisplay.
    disp = ConfusionMatrixDisplay(
        confusion_matrix=cm,  # Pass the confusion matrix.
        display_labels=le.classes_,  # Use the encoded labels for display.
    )
    # Create a plot for the confusion matrix.
    _fig, ax = plt.subplots(figsize=(8, 8))
    disp.plot(
        cmap=plt.cm.Blues,  # Set the color map.
        values_format="d",  # Set the format of the values.
        xticks_rotation="horizontal",  # Set the x-axis labels rotation.
        colorbar=True,  # Show the color bar.
        ax=ax,  # Set the axis.
    )
    plt.title("Confusion Matrix", fontsize=16)  # Set the title.
    plt.xlabel("Predicted Label", fontsize=14)  # Set the axis labels.
    plt.ylabel("True Label", fontsize=14)  # Set the axis labels.
    plt.tight_layout()  # Adjust the layout to fit the plot.

    pltObject = plt.gcf()  # Get the current figure object.

    # Create a dictionary to hold the objects for saving.
    objects = {
        "Model": model,
        "CurrentColumns": currentColumns,
        "Scaler": scaler,
        "LabelEncoder": le,
    }

    # Labels are cast to str since class values may be numeric (e.g. a "Class" column of ints).
    return metrics, pltObject, objects, cm, le.classes_.astype(str).tolist()
