# Model Training Guide: Approach 3 / Phase 8

This directory contains the pipeline to fine-tune your own custom models on Kaggle's free GPUs and export them as lightweight ONNX models for the News Bias Analyzer.

---

## 📁 Files

* **[`train_news_bias_models_fixed.ipynb`](./train_news_bias_models_fixed.ipynb)**: Complete, self-contained notebook for training the fake-news and political-bias models on Kaggle.

---

## 🚀 Step-by-Step Instructions

### Step 1: Open Kaggle
1. Go to [kaggle.com](https://www.kaggle.com) and log in (or create a free account).
2. Go to **Code** (in the left sidebar) and click **New Notebook**.

### Step 2: Enable Free GPU
1. In the right-hand panel under **Notebook options**:
   * Click **Accelerator**.
   * Select **GPU T4 x2** (or **GPU T4** / **GPU P100**).
   * Ensure **Internet** is toggled **ON** (needed to download HuggingFace datasets).

### Step 3: Import the Notebook
1. In the top menu bar of Kaggle, click **File → Import Notebook**.
2. Select **Upload** and upload `training/train_news_bias_models_fixed.ipynb` from this repo.

### Step 4: Run Training
1. Click **Run All** (or `Shift + Enter` through each cell).
2. Training takes **~15 to 25 minutes** total:
   * **Task 1**: Fine-tunes Fake-News classifier on the **LIAR dataset** (~5 mins).
   * **Task 2**: Fine-tunes Political-Bias classifier on **AllSides / Media Bias data** (~10 mins).
   * **Task 3**: Dynamic INT8 quantization to ONNX (~65 MB each) (~3 mins).
   * **Task 4**: Zips the exported bundle into `models_bundle.zip`.

### Step 5: Download the Trained Models
1. Look at the right sidebar under **Output / Data**.
2. Locate **`models_bundle.zip`**.
3. Click the three dots next to it and select **Download**.

### Step 6: Add to Your Backend
1. Extract `models_bundle.zip` into your project at:
   ```
   backend/models/
     ├── fake_news.onnx
     ├── fake_news_labels.json
     ├── fake_news_tokenizer/
     ├── political_bias.onnx
     ├── political_bias_labels.json
     └── political_bias_tokenizer/
   ```
2. Your backend can now run direct local inferences with zero Gemini API calls for classification!

## Emotion-tone and sentiment models

[`train_emotion_sentiment_models.ipynb`](./train_emotion_sentiment_models.ipynb) fine-tunes two more DistilBERT models so the
whole local pipeline is your own:

| Model | Dataset | Labels |
|---|---|---|
| `emotion_tone` | GoEmotions (regrouped into 4 bands) | calm / neutral / charged / inflammatory |
| `sentiment` | TweetEval sentiment | negative / neutral / positive |

Run it on Kaggle the same way, download `models_extra.zip`, and extract it into `backend/models/` next to the
fake-news and bias models. `backend/app/ai/local_classifiers.py` loads them automatically; if the files are missing,
`nlp_pipeline.py` falls back to the pretrained HuggingFace models. The tone labels are derived from GoEmotions
with a documented grouping, not a human-labelled tone dataset.
