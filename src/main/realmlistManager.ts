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
    throw new Error('Realmlist file not found.');
  }

  const content = await fs.readFile(realmlistFile, 'utf8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  let foundTarget = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.toLowerCase().includes('set realmlist')) {
      if (line.toLowerCase().includes(targetRealmlist.toLowerCase())) {
        // Uncomment it if it's commented
        newLines.push(`set realmlist ${targetRealmlist}`);
        foundTarget = true;
      } else {
        // Comment out other realmlists
        if (!line.startsWith('#')) {
          newLines.push(`# ${line}`);
        } else {
          newLines.push(line);
        }
      }
    } else {
      newLines.push(line);
    }
  }

  if (!foundTarget) {
    newLines.push(`set realmlist ${targetRealmlist}`);
  }

  await fs.writeFile(realmlistFile, newLines.join('\n'));
};
