#!/bin/sh
set -eu
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
echo 'Git hooks enabled: private OCR data will be rejected if staged.'
