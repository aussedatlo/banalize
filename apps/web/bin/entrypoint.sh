#!/bin/sh

ENV_PREFIX="BANALIZE_"

# Loop over all environment variables that start with the defined prefix
for var in $(env | grep "^$ENV_PREFIX" | awk -F= '{print $1}'); do
  # Get the value of the environment variable
  value=$(eval echo \$$var)

  # Log the substitution process for debugging purposes
  echo "Replacing placeholder $var with value $value in .next/ files..."

  # Replace the environment variable placeholder in all files inside the .next/ directory
  find apps/web/.next/ -type f -exec sed -i "s|$var|$value|g" {} \;
done

# Keep the container alive after the replacements
pnpm web start
