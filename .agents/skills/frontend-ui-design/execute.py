#!/usr/bin/env python3
import argparse
import json
import sys

def main():
    parser = argparse.ArgumentParser(description="Execute skill: ui-design")
    parser.add_argument("--input", type=str, required=True, help="Input JSON payload")
    args = parser.parse_args()

    try:
        payload = json.loads(args.input)
    except json.JSONDecodeError as e:
        output = {
            "status": "error",
            "message": f"Invalid JSON input: {e}",
            "data": None
        }
        print(json.dumps(output))
        sys.exit(1)

    try:
        # Execution logic goes here
        # For now, it simply echoes the parsed input and confirms execution.

        result_data = {
            "executed_entity": "ui-design",
            "entity_type": "skill",
            "payload_received": payload
        }

        output = {
            "status": "success",
            "message": "skill ui-design executed successfully",
            "data": result_data
        }
        print(json.dumps(output))
    except Exception as e:
        output = {
            "status": "error",
            "message": f"Execution failed: {e}",
            "data": None
        }
        print(json.dumps(output))
        sys.exit(1)

if __name__ == "__main__":
    main()
