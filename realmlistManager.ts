import * as fs from 'fs-extra';
import * as path from 'path';

export const updateRealmlist = async (gamePath: string, targetRealmlist: string) => {
  const possiblePaths = [
    path.join(gamePath, 'Data', 'enUS', 'realmlist.wtf'),
    path.join(gamePath, 'Data', 'enGB', 'realmlist.wtf'),
    path.join(gamePath, 'realmlist.wtf'),
  ];

  let realmlistFile = '';
  for (const p of possiblePaths) {
    if (await fs.pathExists(p)) {
      realmlistFile = p;
      break;
    }
  }

  if (!realmlistFile) {
    console.error('Realmlist file not found in any standard locations.');
    return; // We don't want to crash if it's missing, just log it
  }

  console.log(`Updating realmlist at: ${realmlistFile} to ${targetRealmlist}`);
  
  // Simple and aggressive: Just overwrite the file with the single correct line.
  // This ensures no old realmlists or weird comments interfere.
  try {
    await fs.writeFile(realmlistFile, `set realmlist ${targetRealmlist}\n`);
    console.log('Realmlist updated successfully.');
  } catch (err) {
    console.error('Failed to write realmlist file:', err);
  }
};
