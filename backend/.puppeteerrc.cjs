/**
 * PUPPETEER CONFIG — Sistema Upgrade
 *
 * Usa o Chrome já instalado no Windows em vez de tentar baixar
 * uma versão separada durante o npm install.
 *
 * Isso evita o erro de download/extração do Chrome Headless
 * que ocorre em ambientes Windows com npm install.
 *
 * Se o Chrome não estiver em nenhum dos caminhos abaixo,
 * adicione PUPPETEER_EXECUTABLE_PATH no backend/.env
 * apontando para o chrome.exe correto.
 */

const os = require('os');
const fs = require('fs');

// Caminhos possíveis do Chrome no Windows
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
];

// Usa o primeiro caminho encontrado, ou deixa o Puppeteer decidir
const executablePath = chromePaths.find(p => {
  try { return fs.existsSync(p); } catch { return false; }
}) || undefined;

/** @type {import("puppeteer").Configuration} */
module.exports = {
  // Pula o download automático do Chrome no npm install
  skipDownload: true,
  // Caminho do Chrome instalado no sistema
  executablePath,
};
