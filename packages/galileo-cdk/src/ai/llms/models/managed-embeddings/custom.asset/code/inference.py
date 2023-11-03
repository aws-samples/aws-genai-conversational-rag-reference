import os
from pathlib import Path
import torch
import logging
import torch.nn.functional as F
from transformers import AutoModel, AutoModelForSequenceClassification, AutoTokenizer

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

"""
{
    "type": "embeddings",
    "model": "intfloat/multilingual-e5-large",
    "input": "I love Berlin",
}

{
    "type": "cross-encoder",
    "model": "cross-encoder/ms-marco-MiniLM-L-12-v2",
    "input": "I love Berlin",
    "passages": ["I love Paris", "I love London"]
}

"""

TYPE_EMBEDDING = "embedding"
TYPE_CROSS_ENCODER = "cross-encoder"

model_ids = os.environ["MANAGED_EMBEDDINGS_MODEL_IDS"]
models_list = list(map(lambda val: val.strip(), model_ids.split(",")))
models_num = len(models_list)

def process_model_list(model_list):
    return list(map(lambda x: x.split("/")[-1], model_list))


def mean_pooling(model_output, attention_mask):
    """Mean Pooling - Take attention mask into account for correct averaging"""
    # First element of model_output contains all token embeddings
    token_embeddings = model_output[0]
    input_mask_expanded = (
        attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    )
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(
        input_mask_expanded.sum(1), min=1e-9
    )

def get_model_type(model_id: str) -> str:
    if model_id.split("/")[0] == TYPE_CROSS_ENCODER:
        return TYPE_CROSS_ENCODER
    return TYPE_EMBEDDING

def is_cross_encoder(model_id: str) -> bool:
    return get_model_type(model_id) == TYPE_CROSS_ENCODER

def model_fn(model_dir):
    logger.info("model_fn")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    config = {}
    for model_id in models_list:
        if is_cross_encoder(model_dir):
          cross_encoder_model_dir = os.path.join(model_dir, model_id)
          cross_encoder_model = AutoModelForSequenceClassification.from_pretrained(
              cross_encoder_model_dir
          )
          cross_encoder_tokenizer = AutoTokenizer.from_pretrained(cross_encoder_model_dir)

          cross_encoder_model.eval()
          cross_encoder_model.to(device)

          model_config = {
              "model": cross_encoder_model,
              "tokenizer": cross_encoder_tokenizer,
          }

          config[model_id] = model_config
        else:
          embeddings_model_dir = f"{model_dir}/{model_id}"
          embeddings_tokenizer = AutoTokenizer.from_pretrained(embeddings_model_dir)
          embeddings_model = AutoModel.from_pretrained(embeddings_model_dir)
          embeddings_model.eval()
          embeddings_model.to(device)

          model_config = {
              "model": embeddings_model,
              "tokenizer": embeddings_tokenizer,
          }

          config[model_id] = model_config

    return config


def predict_fn(input_object, config):
    logger.info("predict_fn")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    current_model_id: str = input_object.get("model", models_list[0])
    current_model_config = config.get(current_model_id)
    if not current_model_config:
        raise ValueError(f"Model {current_model_id} not found: available models {model_ids}")

    current_model = current_model_config["model"]
    current_tokenizer = current_model_config["tokenizer"]
    current_is_cross_encoder = input_object.get("type", get_model_type(current_model_id)) == TYPE_CROSS_ENCODER

    if current_is_cross_encoder != True:
        current_input = input_object["input"]
        if current_model_id.startswith("intfloat/multilingual-e5"):
            if isinstance(current_input, list):
                current_input = list(map(lambda val: "query: " + val, current_input))
            else:
                current_input = "query: " + current_input

        with torch.inference_mode():
            encoded_input = current_tokenizer(
                current_input,
                padding=True,
                truncation=True,
                return_tensors="pt",
            )

            encoded_input = encoded_input.to(device)
            model_output = current_model(**encoded_input)

            input_embeddings = mean_pooling(
                model_output, encoded_input["attention_mask"]
            )

            input_embeddings = F.normalize(input_embeddings, p=2, dim=1)
            response = input_embeddings.cpu().numpy()
            ret_value = response.tolist()

            return ret_value
    else:
        current_input = input_object["input"]
        passages = input_object["passages"]
        data = [[current_input, passage] for passage in passages]

        with torch.inference_mode():
            features = current_tokenizer(
                data, padding=True, truncation=True, return_tensors="pt"
            )

            features = features.to(device)

            scores = current_model(**features).logits.cpu().numpy()
            ret_value = list(
                map(
                    lambda val: val[-1] if isinstance(val, list) else val,
                    scores.tolist(),
                )
            )

            return ret_value

    return []
