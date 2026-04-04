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
    sheet = ss.getSheets()[0];
  }
  return sheet;
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getTargetSheet(ss);
    const data = sheet.getDataRange().getValues();
    
    // 1. Lấy danh sách người dùng
    if (action === 'getUsers') {
      const users = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          users.push({
            id: i.toString(),
            account: data[i][0].toString().trim(),
            role: (data[i][2] || 'user').toString().trim()
          });
        }
      }
      return createResponse(users);
    }
    
    // 2. Đăng nhập
    if (action === 'login') {
      const account = (e.parameter.account || "").toString().trim().toLowerCase();
      const password = (e.parameter.password || "").toString().trim();
      
      if (!account || !password) {
        return createResponse({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu' });
      }

      for (let i = 1; i < data.length; i++) {
        const sheetAccount = (data[i][0] || "").toString().trim().toLowerCase();
        const sheetPassword = (data[i][1] || "").toString().trim();
        
        if (sheetAccount === account && sheetPassword === password) {
          return createResponse({
            success: true,
            user: {
              id: i.toString(),
              account: data[i][0].toString().trim(),
              role: (data[i][2] || 'user').toString().trim()
            }
          });
        }
      }
      return createResponse({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }

    // 3. Thêm người dùng (Sử dụng GET)
    if (action === 'addUser') {
      const account = (e.parameter.account || "").toString().trim();
      const password = (e.parameter.password || "").toString().trim();
      const role = (e.parameter.role || 'user').toString().trim();
      
      if (!account || !password) {
        return createResponse({ success: false, message: 'Thiếu thông tin tài khoản' });
      }

      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim().toLowerCase() === account.toLowerCase()) {
          return createResponse({ success: false, message: 'Tài khoản đã tồn tại' });
        }
      }
      
      sheet.appendRow([account, password, role]);
      return createResponse({ success: true, message: 'Thêm tài khoản thành công' });
    }

    // 4. Xóa người dùng
    if (action === 'deleteUser') {
      const account = (e.parameter.account || "").toString().trim().toLowerCase();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim().toLowerCase() === account) {
          sheet.deleteRow(i + 1);
          return createResponse({ success: true, message: 'Xóa tài khoản thành công' });
        }
      }
      return createResponse({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    // 5. Chỉnh sửa người dùng
    if (action === 'updateUser') {
      const oldAccount = (e.parameter.oldAccount || "").toString().trim().toLowerCase();
      const newAccount = (e.parameter.newAccount || "").toString().trim();
      const newPassword = (e.parameter.newPassword || "").toString().trim();
      const newRole = (e.parameter.newRole || 'user').toString().trim();

      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim().toLowerCase() === oldAccount) {
          sheet.getRange(i + 1, 1).setValue(newAccount);
          if (newPassword) sheet.getRange(i + 1, 2).setValue(newPassword);
          sheet.getRange(i + 1, 3).setValue(newRole);
          return createResponse({ success: true, message: 'Cập nhật tài khoản thành công' });
        }
      }
      return createResponse({ success: false, message: 'Không tìm thấy tài khoản' });
    }
    
    return createResponse({ success: false, message: 'Hành động không hợp lệ' });
  } catch (error) {
    return createResponse({ success: false, message: 'Lỗi Script: ' + error.toString() });
  }
}

function doPost(e) {
  return doGet(e);
}
