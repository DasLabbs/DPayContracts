import { Database } from "./db";
import hardhat from "hardhat";
import delay from "./delay";

interface Web3UtilsInitial {
  delayStep?: number; //Delay time in milliseconds
  redeploy?: boolean; // Redeploy flag
}

export class Web3Utils {
  delayStep: number;
  redeploy: boolean;
  public db: Database;

  constructor({ delayStep, redeploy }: Web3UtilsInitial) {
    this.delayStep = delayStep ?? 1000;
    this.redeploy = redeploy ?? true;
    this.db = new Database();
  }

  /**
   * Get saved smart contract from db
   * @param smcName Name of smart contract
   * @param network Block chain network
   * @returns Saved Smart contract
   */
  getContract = async (
    smcName: string,
    network: string = hardhat.network.name
  ) => {
    let address = this.db.read(network, smcName);
    if (!address) throw new Error("Contract not found");
    return hardhat.ethers.getContractAt(smcName, address);
  };

  /**
   * Deploy smart contract in current network then save to db
   * @param smcName Name of smart contract
   * @param args Arguments in constructor of smart contract
   * @returns Deployed smart contract
   */
  deployContract = async (smcName: string, args: any[]) => {
    // Get current network name
    let network = hardhat.network.name;
    let address = this.db.read(network, smcName);
    // Return deployed contract if this.redeploy = false
    if (address && this.redeploy)
      return hardhat.ethers.getContractAt(smcName, address);

    console.log(`Deploy ${smcName} on ${network}...`);
    await delay(this.delayStep);
    const smcFactory = await hardhat.ethers.getContractFactory(smcName);
    const smc = await smcFactory.deploy(...args);

    const contractAddress: string = smc.target.toString();
    this.db.write(network, smcName, contractAddress);
    console.log(`Deploy success ${smcName}, address: ${contractAddress}`);
    return smc;
  };
}
