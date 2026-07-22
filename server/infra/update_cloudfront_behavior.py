#!/usr/bin/env python3
"""Merge the chat-backend Lambda origin + /api/* behavior into a CloudFront
DistributionConfig, idempotently (re-running with the same inputs produces
the same output).

Used by .github/workflows/chat-backend.yml's `provision` job — not part of
the Lambda bundle (esbuild only bundles src/handler.ts).

Reads the current DistributionConfig from the path in DIST_CONFIG_PATH (the
raw output of `aws cloudfront get-distribution-config`), and writes the
merged DistributionConfig (only — matching what `update-distribution`
expects for --distribution-config) to OUTPUT_PATH.

Required environment variables: DIST_CONFIG_PATH, OUTPUT_PATH, LAMBDA_DOMAIN,
OAC_ID.
"""

import json
import os

ORIGIN_ID = "chat-lambda-origin"
BEHAVIOR_PATH_PATTERN = "/api/*"

# Managed-CachingDisabled — dynamic, per-visitor SSE responses must never be cached.
CACHE_POLICY_ID = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"

# Managed-AllViewerExceptHostHeader — forward everything except Host, which
# CloudFront rewrites to the Lambda Function URL's own host.
ORIGIN_REQUEST_POLICY_ID = "b689b0a8-53d0-40ab-baf2-68738e2966ac"


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def build_origin(lambda_domain: str, oac_id: str) -> dict:
    return {
        "Id": ORIGIN_ID,
        "DomainName": lambda_domain,
        "OriginPath": "",
        "CustomHeaders": {"Quantity": 0},
        "CustomOriginConfig": {
            "HTTPPort": 80,
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "https-only",
            "OriginSslProtocols": {"Quantity": 1, "Items": ["TLSv1.2"]},
            "OriginReadTimeout": 30,
            "OriginKeepaliveTimeout": 5,
        },
        "OriginAccessControlId": oac_id,
        "ConnectionAttempts": 3,
        "ConnectionTimeout": 10,
        "OriginShield": {"Enabled": False},
    }


def build_behavior() -> dict:
    return {
        "PathPattern": BEHAVIOR_PATH_PATTERN,
        "TargetOriginId": ORIGIN_ID,
        "ViewerProtocolPolicy": "https-only",
        "AllowedMethods": {
            "Quantity": 7,
            "Items": ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
            "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
        },
        "CachePolicyId": CACHE_POLICY_ID,
        "OriginRequestPolicyId": ORIGIN_REQUEST_POLICY_ID,
        "Compress": True,
        "SmoothStreaming": False,
        "FieldLevelEncryptionId": "",
        "TrustedSigners": {"Enabled": False, "Quantity": 0},
        "TrustedKeyGroups": {"Enabled": False, "Quantity": 0},
        "LambdaFunctionAssociations": {"Quantity": 0},
        "FunctionAssociations": {"Quantity": 0},
    }


def main() -> None:
    dist_config_path = require_env("DIST_CONFIG_PATH")
    output_path = require_env("OUTPUT_PATH")
    lambda_domain = require_env("LAMBDA_DOMAIN")
    oac_id = require_env("OAC_ID")

    with open(dist_config_path) as f:
        data = json.load(f)
    config = data["DistributionConfig"]

    origins = config["Origins"]["Items"]
    new_origin = build_origin(lambda_domain, oac_id)
    existing_origin = next((o for o in origins if o["Id"] == ORIGIN_ID), None)
    if existing_origin:
        origins[origins.index(existing_origin)] = new_origin
    else:
        origins.append(new_origin)
    config["Origins"]["Quantity"] = len(origins)
    config["Origins"]["Items"] = origins

    behaviors = config.get("CacheBehaviors") or {}
    items = behaviors.get("Items") or []
    new_behavior = build_behavior()
    existing_behavior = next((b for b in items if b["PathPattern"] == BEHAVIOR_PATH_PATTERN), None)
    if existing_behavior:
        items[items.index(existing_behavior)] = new_behavior
    else:
        items.append(new_behavior)
    config["CacheBehaviors"] = {"Quantity": len(items), "Items": items}

    with open(output_path, "w") as f:
        json.dump(config, f)


if __name__ == "__main__":
    main()
