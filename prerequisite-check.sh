#!/bin/bash

# Set colors using tput
if [ "${CI:-false}" = "true" ]; then
  # disable colors in CI
  red=""
  green=""
  yellow=""
  cyan=""
  bold=""
  reset=""
else
  red=$(tput -T xterm setaf 1)
  green=$(tput -T xterm setaf 2)
  yellow=$(tput -T xterm setaf 3)
  cyan=$(tput -T xterm setaf 6)
  bold=$(tput -T xterm bold)
  reset=$(tput -T xterm sgr0)
fi

echo "${cyan}Galileo Prerequisite Check...${reset}"
uname -a

# We need pnpm dlx for semver check
if ! [ -x "$(command -v pnpm)" ]; then
  echo "${red}pnpm: Not installed ${reset}"
  echo "${yellow}Required >=8.x; Install https://pnpm.io/installation ${rest}"
  exit 1
fi

check() {
  local cmd="$1"
  local version_cmd="$2"
  local range="$3"
  local recommendation="$4"
  local print="$recommendation"

  if ! [ -x "$(command -v $cmd)" ]; then
    [ -n "$print" ] && echo "${red}$cmd: Not installed - required $range ${reset}"
    [ -n "$print" ] && echo "${yellow}$recommendation ${reset}"
    return 1
  fi

  local version="$($version_cmd)"
  local valid_version=$(pnpm --silent dlx semver --coerce --range "$range" "$version")
  [ -n "$print" ] && echo "${cyan}$cmd: $version ${reset}"
  if [ -z "$valid_version" ]; then
    [ -n "$print" ] && echo "${red}$cmd: required $range; found $version ${reset}"
    [ -n "$print" ] && echo "${yellow}$recommendation ${reset}"
    return 1
  fi

  return 0
}

check "pnpm" "pnpm --version" ">=8" \
  "Recommendation: Install PNPM 8.6+. See https://pnpm.io/installation"
PNPM_PASS=$?

check "node" "node --version" ">=18" \
  "Recommendation: Use nvm to install NodeJS 18+. See https://github.com/nvm-sh/nvm"
NODEJS_PASS=$?

check "python" "python --version" ">=3.10 <4" \
  "Recommendation: Use pyenv to install Python 3.11+. See https://github.com/pyenv/pyenv"
PYTHON_PASS=$?

check "poetry" "poetry --version" ">=1.5 <2" \
  "Recommendation: Use poetry to install Python 3.11+. See https://python-poetry.org/docs/#installation"
POETRY_PASS=$?

check "docker" "docker --version" ">=20.10" \
  "Recommendation: Use Docker Desktop to install Docker 20+. See https://docs.docker.com/desktop/"
DOCKER_PASS=$?

check "java" "java --version | head -n 1" ">=17" \
  "Recommendation: Use Amazon Corretto 17. See https://docs.aws.amazon.com/corretto/latest/corretto-17-ug/downloads-list.html"
JAVA_PASS=$?

check "aws" "aws --version" ">=2.13.23 <3" \
  "Recommendation: AWS CLI v2 is required. See https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
AWS_PASS=$?

# Apple arm64 warnings
if [ "$(uname -s)" = "Darwin" ]; then
  if [ "$(uname -m)" = "arm64" ]; then
    check "python" "python --version" "3.10"
    if [ $? != 0 ]; then
      echo ""
      echo "${yellow}[Apple Chip] Python3.10 might be required for some python packages on Apple arm64 chips - if you see errors during build please ensure python 3.10 is installed ${reset}"
      echo "${yellow}Recommend using pyenv for multiple python version support. See https://github.com/pyenv/pyenv ${reset}"
      echo "${yellow}See https://github.com/comfyanonymous/ComfyUI/issues/1164#issuecomment-1670798956 ${reset}"
    fi
  fi
fi

echo ""
if [ $PNPM_PASS != 0 ] || [ $NODEJS_PASS != 0 ] || [ $PYTHON_PASS != 0 ] || [ $POETRY_PASS != 0 ] || [ $DOCKER_PASS != 0 ] || [ $JAVA_PASS != 0 ] || [ $AWS_PASS != 0 ]; then
  echo "${bold}${red}Prerequisite check failed ${reset}"
  exit 1
else
  echo "${bold}${green}Prerequisite check passed ${reset}"
fi
