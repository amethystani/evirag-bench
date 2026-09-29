#!/bin/sh
# Camera-ready build. Requires tectonic (brew install tectonic).
set -e
tectonic -X compile acl_latex.tex --keep-logs
echo "--- warnings ---"
grep -c 'Overfull' acl_latex.log  || true
grep -ci 'undefined' acl_latex.log || true
grep 'Output written' acl_latex.log
