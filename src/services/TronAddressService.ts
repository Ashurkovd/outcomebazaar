import { ethers } from 'ethers';
import { TronWeb } from 'tronweb';

/**
 * TronAddressService — derives TRC20 deposit addresses from an HD mnemonic.
 *
 * Path: m/44'/195'/0'/0/{index}  (195 is Tron's SLIP-44 coin type.)
 * The master mnemonic controls every derived address — it's the custodial hot
 * wallet. Keep TRON_HD_MNEMONIC in a secret manager, never log it.
 */
export class TronAddressService {
  private mnemonic: ethers.Mnemonic;

  constructor(mnemonicPhrase: string) {
    const trimmed = mnemonicPhrase.trim();
    if (!ethers.Mnemonic.isValidMnemonic(trimmed)) {
      throw new Error('TRON_HD_MNEMONIC is not a valid BIP-39 phrase');
    }
    this.mnemonic = ethers.Mnemonic.fromPhrase(trimmed);
  }

  /** Base58 Tron address for a given derivation index. */
  deriveAddress(index: number): string {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid derivation index: ${index}`);
    }
    const node = ethers.HDNodeWallet.fromMnemonic(this.mnemonic, `m/44'/195'/0'/0/${index}`);
    const privateKeyHex = node.privateKey.slice(2);
    return TronWeb.address.fromPrivateKey(privateKeyHex) as string;
  }
}
