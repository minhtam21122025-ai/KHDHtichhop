/**
 * Google Apps Script (code.gs)
 * Link Spreadsheet ID: 1Tp7tyGtrjwpodjVwfBgvq0erlwpRuTVIfM5wNv7mmPI
 * Columns: Tài khoản, Mật khẩu, quyền
 */

const SPREADSHEET_ID = '1Tp7tyGtrjwpodjVwfBgvq0erlwpRuTVIfM5wNv7mmPI';
const SHEET_NAME = 'Sheet1'; 

function getTargetSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0]; // Lấy trang tính đầu tiên nếu không tìm thấy Sheet1
  }
  return sheet;
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getTargetSheet(ss);
    const data = sheet.getDataRange().getValues();
    
    if (action === 'getUsers') {
      const users = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          users.push({
            id: i.toString(),
            account: data[i][0].toString().trim(),
            password: data[i][1].toString().trim(),
            role: (data[i][2] || 'user').toString().trim()
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify(users))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'login') {
      const account = (e.parameter.account || "").toString().trim().toLowerCase();
      const password = (e.parameter.password || "").toString().trim();
      
      for (let i = 1; i < data.length; i++) {
        const sheetAccount = (data[i][0] || "").toString().trim().toLowerCase();
        const sheetPassword = (data[i][1] || "").toString().trim();
        
        if (sheetAccount === account && sheetPassword === password) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            user: {
              id: i.toString(),
              account: data[i][0],
              role: (data[i][2] || 'user').toString().trim()
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Sai tài khoản hoặc mật khẩu' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getTargetSheet(ss);
    
    if (action === 'addUser') {
      const account = (params.account || "").toString().trim();
      const password = (params.password || "").toString().trim();
      const role = (params.role || 'user').toString().trim();
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim().toLowerCase() === account.toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Tài khoản đã tồn tại' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      sheet.appendRow([account, password, role]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Thêm tài khoản thành công' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
