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
 * ตรวจสอบว่าแอปกำลังทำงานแบบ standalone (ติดตั้งบน Home Screen) หรือไม่
 */
function isStandaloneMode() {
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}
 
/**
 * สร้าง URL สำหรับ redirect ไปหน้ายืนยันตัวตนของ Google โดยตรง
 * ใช้แทน popup เมื่อทำงานใน standalone mode บน iOS
 */
function buildGoogleAuthRedirectUrl() {
  const params = new URLSearchParams({
    client_id: GDRIVE_CLIENT_ID,
    redirect_uri: GDRIVE_REDIRECT_URI,
    response_type: "token",
    scope: GDRIVE_SCOPE,
    include_granted_scopes: "true",
    prompt: gdriveAccessToken ? "" : "consent",
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
}
 
/**
 * ตรวจสอบ URL หลัง redirect กลับจาก Google ว่ามี access_token แนบมาหรือไม่
 * เรียกครั้งเดียวตอนหน้าเว็บโหลด หากพบ token จะเก็บไว้และเรียกฟังก์ชันที่ค้างไว้ก่อน redirect ต่อให้อัตโนมัติ
 */
function handleGoogleAuthRedirectResult() {
  if (!window.location.hash.includes("access_token")) return;
 
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const token = hashParams.get("access_token");
  if (!token) return;
 
  gdriveAccessToken = token;
 
  // ลบ token ออกจาก URL เพื่อไม่ให้ค้างอยู่ใน address bar หรือ browser history
  history.replaceState(null, "", window.location.pathname);
 
  const pendingAction = sessionStorage.getItem("gdrivePendingAction");
  sessionStorage.removeItem("gdrivePendingAction");
 
  // ต้องรอให้ gapi client พร้อมก่อนจึงเรียกฟังก์ชันที่ค้างไว้ได้
  const waitForGapi = setInterval(() => {
    if (!gdriveGapiReady) return;
    clearInterval(waitForGapi);
    gapi.client.setToken({ access_token: gdriveAccessToken });
 
    if (pendingAction === "save") saveToGoogleDrive();
    if (pendingAction === "load") loadFromGoogleDrive();
  }, 200);
}
 
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
 * ขอสิทธิ์เข้าถึงจากผู้ใช้
 * โหมดปกติ: แสดง popup ล็อกอิน/อนุญาตของ Google (คืนค่าเป็น Promise)
 * standalone mode ที่ยังไม่มี token: redirect ทั้งหน้าไปหน้ายืนยันตัวตนแทน (ฟังก์ชันจะไม่คืนค่า เพราะหน้าเว็บกำลังจะนำทางออกไป)
 */
function requestGoogleDriveAccess(pendingActionName) {
  if (isStandaloneMode() && !gdriveAccessToken) {
    sessionStorage.setItem("gdrivePendingAction", pendingActionName);
    window.location.href = buildGoogleAuthRedirectUrl();
    return new Promise(() => {}); // หน้าเว็บกำลังนำทางออกไป ไม่ต้อง resolve/reject
  }
 
  return new Promise((resolve, reject) => {
    if (!gdriveTokenClient) {
      reject(new Error("ยังไม่ได้เรียก initGoogleDriveClient()"));
      return;
    }
 
    gdriveTokenClient.callback = (response) => {
      if (response.error) {
        reject(response);
        return;
      }
      gdriveAccessToken = response.access_token;
      gapi.client.setToken({ access_token: gdriveAccessToken });
      resolve(gdriveAccessToken);
    };
 
    // ถ้ามี token อยู่แล้วให้ขอแบบไม่ต้องแสดงหน้าต่างซ้ำ
    gdriveTokenClient.requestAccessToken({
      prompt: gdriveAccessToken ? "" : "consent",
    });
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
    await requestGoogleDriveAccess("save");
 
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
    await requestGoogleDriveAccess("load");
 
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
  handleGoogleAuthRedirectResult();
 
  const saveBtn = document.getElementById("save-to-gdrive");
  if (saveBtn) saveBtn.addEventListener("click", saveToGoogleDrive);
 
  const loadBtn = document.getElementById("load-from-gdrive");
  if (loadBtn) loadBtn.addEventListener("click", loadFromGoogleDrive);
});