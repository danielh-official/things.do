#!/bin/bash
# Strip the first -- if present, as pnpm adds it
args="$@"
args="${args#-- }"
exec playwright test $args
