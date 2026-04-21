import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
/**
 * Deploys a contract named "TipJar" using the deployer account.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployTipJar: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  await deploy("TipJar", {
    from: deployer,
    // TipJar constructor has no args (owner = msg.sender)
    args: [],
    log: true,
    autoMine: true,
  });
  const tipjar = await hre.ethers.getContract<Contract>("TipJar", deployer);
  console.log("🔢 Initial balance:", (await tipjar.getBalance()).toString());
};
export default deployTipJar;
deployTipJar.tags = ["TipJar"];
