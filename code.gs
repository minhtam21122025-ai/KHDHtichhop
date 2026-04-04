/**
 * Google Apps Script (code.gs)
 * Link Spreadsheet ID: 1Tp7tyGtrjwpodjVwfBgvq0erlwpRuTVIfM5wNv7mmPI
 * Columns: Tài khoản, Mật khẩu, quyền
 */

const SPREADSHEET_ID = '1Tp7tyGtrjwpodjVwfBgvq0erlwpRuTVIfM5wNv7mmPI';
const SHEET_NAME = 'Sheet1'; // Thay đổi nếu tên trang tính khác

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (action === 'getUsers') {
    const users = [];
    for (let i = 1; i < data.length; i++) {
      users.push({
        id: i.toString(),
        account: data[i][0],
        password: data[i][1],
        role: data[i][2] || 'user'
      });
    }
    return ContentService.createTextOutput(JSON.stringify(users))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'login') {
    const account = e.parameter.account;
    const password = e.parameter.password;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == account && data[i][1] == password) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          user: {
            id: i.toString(),
            account: data[i][0],
            role: data[i][2] || 'user'
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Sai tài khoản hoặc mật khẩu' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (action === 'addUser') {
    const account = params.account;
    const password = params.password;
    const role = params.role || 'user';
    
    // Check if exists
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == account) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Tài khoản đã tồn tại' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    sheet.appendRow([account, password, role]);
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Thêm tài khoản thành công' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
