import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
/**
 * Deploys a contract named "Counter" using the deployer account.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployCounter: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  await deploy("Counter", {
    from: deployer,
    // Counter constructor has no args (owner = msg.sender)
    args: [],
    log: true,
    autoMine: true,
  });
  const counter = await hre.ethers.getContract<Contract>("Counter", deployer);
  console.log("🔢 Initial counter:", (await counter.getCounter()).toString());
};
export default deployCounter;
deployCounter.tags = ["Counter"];
