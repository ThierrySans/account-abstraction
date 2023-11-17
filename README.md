## Hardhat Setup (no bundler)

Run the tests

```
npm install
npx hardhat test
```

## Local GETH node setup + bundler

1. Run a local GETH node (Docker container)

```
docker run --rm -ti --name geth -p 8545:8545 ethereum/client-go:v1.10.26 \
  --miner.gaslimit 12000000 \
  --http --http.api personal,eth,net,web3,debug \
  --http.vhosts '*,localhost,host.docker.internal' --http.addr "0.0.0.0" \
  --ignore-legacy-receipts --allow-insecure-unlock --rpc.allow-unprotected-txs \
  --dev \
  --verbosity 2 \
  --nodiscover --maxpeers 0 --mine --miner.threads 1 \
  --networkid 1337
```

2. clone the eth-infinistism bundler

```
git clone https://github.com/eth-infinitism/bundler
cd bundler
yarn && yarn preprocess
```

3. Deploy contracts (entrypoint, ...) on the GETH node

```
yarn hardhat-deploy --network localhost
```

4. Run the bundler

```
yarn run bundler
```

5. Run the tests

```
npm install
npx hardhat test --network localhost
```

## Sepolia

1. Create an `.env` file with the following: 

```
METAMASK_PRIVATE_KEY=
ALCHEMY_API_KEY=
ETHERSCAN_API_KEY=
```

Make sure that you have at least 1 SepETH on your metamask private key. 

2.  Run the tests

```
npm install
npx hardhat test --network sepolia
```
