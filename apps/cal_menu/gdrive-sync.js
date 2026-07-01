/**
 * gdrive-sync.js
 * ฟังก์ชันเชื่อมต่อ Google Drive API สำหรับบันทึกและอ่านข้อมูลแอป (appData)
 * ต้องโหลดสคริปต์ต่อไปนี้ในหน้า HTML ก่อนไฟล์นี้
 *   <script src="https://accounts.google.com/gsi/client" async defer></script>
 *   <script src="https://apis.google.com/js/api.js"></script>
 */

// ตั้งค่าพื้นฐาน แก้ไข CLIENT_ID เป็นค่าที่ได้จาก Google Cloud Console
const GDRIVE_CLIENT_ID = "514607683553-v15ro4a8l2e3aojj573ta5q1tiidsh7n.apps.googleusercontent.com";
const GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GDRIVE_FILE_NAME = "app-data-ถนัดตวง.json";
const GDRIVE_MIME_TYPE = "application/json";

// ต้องตรงกับค่าที่กรอกไว้ใน Authorized redirect URIs บน Google Cloud Console เป๊ะทุกตัวอักษร
const GDRIVE_REDIRECT_URI = window.location.origin + window.location.pathname;


let gdriveTokenClient = null;
let gdriveAccessToken = null;
let gdriveGapiReady = false;

/**
 * เตรียม gapi client สำหรับเรียก Drive API
 * เรียกฟังก์ชันนี้หนึ่งครั้งหลังหน้าเว็บโหลดเสร็จ
 */
function initGoogleDriveClient() {
  gapi.load("client", async () => {
    await gapi.client.init({
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    });
    gdriveGapiReady = true;
  });

  gdriveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GDRIVE_CLIENT_ID,
    scope: GDRIVE_SCOPE,
    callback: "", // กำหนดทีหลังตอนเรียกขอสิทธิ์แต่ละครั้ง
  });
}


/**
 * ตรวจสอบและดึง Token ที่อาจจะแนบมากับ URL หลังจากที่ Google ทำการ Redirect กลับมา
 */
function checkAndParseTokenFromUrl() {
  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    if (accessToken) {
      gdriveAccessToken = accessToken;
      gapi.client.setToken({ access_token: gdriveAccessToken });
      // ล้าง hash บน URL เพื่อความสะอาดและปลอดภัย
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  }
  return false;
}

/**
 * ขอสิทธิ์เข้าถึงโดยใช้วิธีการเปลี่ยนหน้า (Redirect) เพื่อหลีกเลี่ยงข้อจำกัดของ iOS PWA
 */
function requestGoogleDriveAccess() {
  return new Promise((resolve, reject) => {
    // 1. ตรวจสอบก่อนว่ามี Token ในหน่วยความจำอยู่แล้วหรือไม่
    if (gdriveAccessToken) {
      resolve(gdriveAccessToken);
      return;
    }

    // 2. ตรวจสอบว่าพึ่งกลับมาจากหน้า Redirect ของ Google หรือไม่
    if (checkAndParseTokenFromUrl()) {
      resolve(gdriveAccessToken);
      return;
    }

    // 3. หากยังไม่มี Token ให้ทำการสร้าง URL สำหรับ Redirect ไปยังหน้าล็อกอินของ Google
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GDRIVE_CLIENT_ID)}` +
      `&redirect_uri=${GDRIVE_REDIRECT_URI}` +
      `&response_type=token` + // หรือใช้ code หากเปลี่ยนเป็น Authorization Code Flow ร่วมกับ Backend
      `&scope=${encodeURIComponent(GDRIVE_SCOPE)}` +
      `&prompt=consent`;

    // เปลี่ยนหน้าไปยัง Google
    window.location.href = authUrl;
  });
}


/**
 * ค้นหาไฟล์ข้อมูลของแอปบน Drive จากชื่อไฟล์
 * คืนค่า fileId หากพบ หรือ null หากยังไม่มีไฟล์
 */
async function findAppFileOnDrive() {
  const response = await gapi.client.drive.files.list({
    q: `name='${GDRIVE_FILE_NAME}' and trashed=false`,
    fields: "files(id, name, modifiedTime)",
    spaces: "drive",
  });

  const files = response.result.files;
  if (files && files.length > 0) {
    return files[0].id;
  }
  return null;
}

/**
 * บันทึกข้อมูล appData ปัจจุบันลง Google Drive
 * หากมีไฟล์อยู่แล้วจะอัปเดตทับ หากยังไม่มีจะสร้างไฟล์ใหม่
 */
async function saveToGoogleDrive() {
  try {
    await requestGoogleDriveAccess();

    const fileId = await findAppFileOnDrive();
    const fileContent = JSON.stringify(appData);
    const boundary = "-------gdrivesyncboundary";
    const metadata = { name: GDRIVE_FILE_NAME, mimeType: GDRIVE_MIME_TYPE };

    const multipartBody =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${GDRIVE_MIME_TYPE}\r\n\r\n` +
      fileContent +
      `\r\n--${boundary}--`;

    const path = fileId
      ? `/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : "/upload/drive/v3/files?uploadType=multipart";
    const method = fileId ? "PATCH" : "POST";

    await gapi.client.request({
      path: path,
      method: method,
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    });

    alert("✅ บันทึกข้อมูลลง Google Drive เรียบร้อยแล้ว");
    switchView('view-home');
  } catch (error) {
    console.error(error);
    alert("❌ บันทึกข้อมูลลง Google Drive ไม่สำเร็จ");
  }
}

/**
 * อ่านข้อมูลจาก Google Drive แล้วนำเข้าสู่แอปด้วย processImportedData
 * ใช้ mode จาก element #import-from-file เช่นเดียวกับ importFromFile
 */
async function loadFromGoogleDrive() {
  try {
    await requestGoogleDriveAccess();

    const fileId = await findAppFileOnDrive();
    if (!fileId) {
      alert("⚠️ ยังไม่พบไฟล์ข้อมูลบน Google Drive");
      return;
    }

    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: "media",
    });

    const parsed = JSON.parse(response.body);
    const mode = 'replace'; // ใช้วิธีแทนที่ทั้งหมด ส่วน merge ยังคิดไม่ออก 
    processImportedData(parsed, mode);

    alert("✅ อ่านข้อมูลจาก Google Drive เรียบร้อยแล้ว");
  } catch (error) {
    console.error(error);
    alert("❌ อ่านข้อมูลจาก Google Drive ไม่สำเร็จ");
  }
}

// เรียกใช้งานเมื่อหน้าเว็บโหลดเสร็จ
window.addEventListener("load", () => {
  initGoogleDriveClient();

  const saveBtn = document.getElementById("save-to-gdrive");
  if (saveBtn) saveBtn.addEventListener("click", saveToGoogleDrive);

  const loadBtn = document.getElementById("load-from-gdrive");
  if (loadBtn) loadBtn.addEventListener("click", loadFromGoogleDrive);
});

