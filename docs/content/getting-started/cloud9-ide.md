## Setting up Cloud9 as your development environment

In your Galileo development account, select:

- Cloud9 → Create Environment
- New EC2 Instance → m5.large + Ubuntu 22.04 + 4h Timeout + AWS Systems Manager
- Open Cloud 9 IDE for the new environment
- Follow the [resize instructions](https://ec2spotworkshops.com/ecs-spot-capacity-providers/workshopsetup/resize_ebs.html), giving your instance EBS volume 300GB
- Reboot the instance before using Cloud9.

Using the Cloud9 instance, install these prerequisites:

```bash
sudo apt update && sudo apt upgrade -y
nvm install lts/iron
nvm use lts/iron
npm i -g pnpm
wget -O- https://apt.corretto.aws/corretto.key | sudo apt-key add -
sudo add-apt-repository 'deb https://apt.corretto.aws stable main'
sudo apt-get update; sudo apt-get install -y java-18-amazon-corretto-jdk

sudo apt install -y python3.11
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 110
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 100
# NOTE: select python3.11 from the list
sudo update-alternatives --config python3
curl -sSL https://install.python-poetry.org | python3 -
```
