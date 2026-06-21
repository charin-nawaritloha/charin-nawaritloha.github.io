/**
 * การประกาศโครงสร้างตัวแปรหลักสำหรับเก็บข้อมูลของระบบ
 */
let appData = {
  ingredients: [],
  menus: [],
};

// ค่าคงที่สำหรับอัตราส่วนการแปลงหน่วยปริมาตรเป็นมิลลิลิตร
const VOL_TO_ML = {
  มิลลิลิตร: 1,
  ลิตร: 1000,
  ช้อนชา: 5,
  ช้อนโต๊ะ: 15,
  ถ้วย: 240, // 1 US legal cup = 240 ml
};

/**
 * ฟังก์ชันสลับการแสดงผลของหน้าจอแอปพลิเคชัน
 */
function switchView(viewId) {
  const views = document.querySelectorAll(".app-view");
  for (let i = 0; i < views.length; i++) {
    views[i].classList.remove("active");
  }
  document.getElementById(viewId).classList.add("active");

  if (viewId === "view-edit-menu") {
    updateMenuDropdown("edit-menu-select");
    loadMenuToEdit();
  }
  if (viewId === "view-calc") {
    updateMenuDropdown("calc-menu-select");
    loadMenuToCalculate();
  }
}

/**
 * ฟังก์ชันจัดเรียงอาร์เรย์ตามชื่อ โดยรองรับภาษาไทยและภาษาอังกฤษตามหลักพจนานุกรม (ข้อ 7)
 */
function sortByName(array) {
  // console.log(array);
  return array.sort((a, b) => a.name.localeCompare(b.name, "th"));
}

/**
 * ฟังก์ชันบันทึกหรือแก้ไขข้อมูลวัตถุดิบพื้นฐานลงในระบบ
 */
function saveIngredient(event) {
  event.preventDefault();
  const id = document.getElementById("ing-id").value;
  const name = document.getElementById("ing-name").value.trim();
  const vol = parseFloat(document.getElementById("ing-vol").value) || null;
  const unit = document.getElementById("ing-vol-unit").value;
  const weight =
    parseFloat(document.getElementById("ing-weight").value) || null;

  const ingData = { id: id || Date.now().toString(), name, vol, unit, weight };

  if (id) {
    const index = appData.ingredients.findIndex((item) => item.id === id);
    if (index !== -1) appData.ingredients[index] = ingData;
  } else {
    appData.ingredients.push(ingData);
  }

  // เรียงลำดับรายการตามชื่อวัตถุดิบทันทีหลังจากเพิ่มหรือแก้ไข (ข้อ 2 และ 7)
  sortByName(appData.ingredients);

  saveToStorage();
  renderIngredients();
  document.getElementById("ingredient-form").reset();
  document.getElementById("ing-id").value = "";
}

/**
 * ฟังก์ชันดึงข้อมูลวัตถุดิบกลับขึ้นมาแสดงที่ฟอร์มเพื่อแก้ไข
 */
function editIngredient(id) {
  const item = appData.ingredients.find((ing) => ing.id === id);
  if (!item) return;

  document.getElementById("ing-id").value = item.id;
  document.getElementById("ing-name").value = item.name;
  document.getElementById("ing-vol").value = item.vol || "";
  document.getElementById("ing-vol-unit").value = item.unit;
  document.getElementById("ing-weight").value = item.weight || "";

  document
    .getElementById("ingredient-form")
    .scrollIntoView({ behavior: "smooth" });
  document.getElementById("ing-submit").innerText = "บันทึกการแก้ไข";
}

/**
 * ฟังก์ชันลบข้อมูลวัตถุดิบออกจากระบบ (ข้อ 1)
 */
function deleteIngredient(id) {
  if (
    !confirm(
      "คุณต้องการลบวัตถุดิบนี้ใช่หรือไม่? การลบจะไม่ส่งผลต่อเมนูอาหารที่เคยบันทึกไว้แล้ว",
    )
  )
    return;
  appData.ingredients = appData.ingredients.filter((ing) => ing.id !== id);
  saveToStorage();
  renderIngredients();
}

/**
 * ฟังก์ชันแสดงรายการวัตถุดิบในตารางจัดการวัตถุดิบ
 */
function renderIngredients() {
  const tbody = document.getElementById("ing-list");
  tbody.innerHTML = "";
  for (let i = 0; i < appData.ingredients.length; i++) {
    const item = appData.ingredients[i];
    const conversionText =
      item.vol && item.weight
        ? `<span style="white-space: nowrap;">${item.vol} ${item.unit}</span> ↔ <span style="white-space: nowrap;">${item.weight} ก.</span>`
        : " ";

    tbody.innerHTML += `<tr>
            <td>${item.name}</td>
            <td>${conversionText}</td>
            <td><div style="display:block;white-space: nowrap;">
                <button onclick="editIngredient('${item.id}')">แก้</button><button onclick="deleteIngredient('${item.id}')" class="delete-button">ลบ</button>
                </div>
            </td>
        </tr>`;
  }
}

/**
 * ฟังก์ชันเพิ่มแถวเลือกวัตถุดิบแบบ Dynamic พร้อมปุ่มเลื่อนลำดับ ขึ้น/ลง (ข้อ 5)
 */
function addIngredientRow(containerId, data = null) {
  const targetId = containerId || "menu-ing-inputs";
  const container = document.getElementById(targetId);
  const div = document.createElement("div");
  div.className = "form-group ing-row";
  //div.style.display = 'flex';
  //div.style.gap = '4px';
  //div.style.alignItems = 'center';
  //div.style.marginBottom = '6px';

  let options = "";
  for (let i = 0; i < appData.ingredients.length; i++) {
    const ingName = appData.ingredients[i].name;
    const selected = data && data.name === ingName ? "selected" : "";
    options += `<option value="${ingName}" ${selected}>${ingName}</option>`;
  }

  const val = data ? data.displayVal : "";
  const unit = data ? data.displayUnit : "กิโลกรัม";

  // เพิ่มปุ่มควบคุมทิศทางเฉพาะในหน้าแก้ไขเมนูอาหารเท่านั้น
  /*
    let moveButtons = '';
    if (targetId === 'edit-menu-ing-inputs') {
        moveButtons = `
            <button type="button" onclick="moveRow(this, 'up')">▲</button>
            <button type="button" onclick="moveRow(this, 'down')">▼</button>
        `;
    }*/

  let moveButtons = `<button type="button" onclick="moveRow(this, 'up')">▲</button><button type="button" onclick="moveRow(this, 'down')">▼</button>`;

  div.innerHTML = `
        ${moveButtons}
        <select class="row-ing-name">${options}</select>
        <input type="number" class="row-ing-val" placeholder="จำนวน" step="any" value="${val}" required>
        <select class="row-ing-unit">
            <option value="กิโลกรัม" ${unit === "กิโลกรัม" ? "selected" : ""}>กิโลกรัม</option>
            <option value="กรัม" ${unit === "กรัม" ? "selected" : ""}>กรัม</option>
            <option value="ช้อนโต๊ะ" ${unit === "ช้อนโต๊ะ" ? "selected" : ""}>ช้อนโต๊ะ</option>
            <option value="ช้อนชา" ${unit === "ช้อนชา" ? "selected" : ""}>ช้อนชา</option>
            <option value="ถ้วย" ${unit === "ถ้วย" ? "selected" : ""}>ถ้วย</option>
            <option value="ลิตร" ${unit === "ลิตร" ? "selected" : ""}>ลิตร</option>
            <option value="มิลลิลิตร" ${unit === "มิลลิลิตร" ? "selected" : ""}>มิลลิลิตร</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" class="delete-button">ลบ</button>
    `;
  container.appendChild(div);
}

/**
 * ฟังก์ชันสำหรับขยับย้ายแถวสลับลำดับวัตถุดิบ ขึ้น หรือ ลง (ข้อ 5)
 */
function moveRow(button, direction) {
  const row = button.parentElement;
  const container = row.parentElement;
  if (direction === "up") {
    const prev = row.previousElementSibling;
    if (prev) container.insertBefore(row, prev);
  } else if (direction === "down") {
    const next = row.nextElementSibling;
    if (next) container.insertBefore(next, row);
  }
}

/**
 * ฟังก์ชันบันทึกข้อมูลเมนูอาหารใหม่ลงระบบ
 */
function saveMenu() {
  const name = document.getElementById("menu-name").value.trim();
  if (!name) return;

  const menu = { id: Date.now().toString(), name, ingredients: [] };
  const rows = document.querySelectorAll("#menu-ing-inputs .ing-row");

  for (let i = 0; i < rows.length; i++) {
    const ingName = rows[i].querySelector(".row-ing-name").value;
    const val = parseFloat(rows[i].querySelector(".row-ing-val").value);
    const unit = rows[i].querySelector(".row-ing-unit").value;

    const calcData = convertToStorageUnit(ingName, val, unit);

    menu.ingredients.push({
      name: ingName,
      displayVal: val,
      displayUnit: unit,
      calcVal: calcData.val,
      calcType: calcData.type,
    });
  }

  appData.menus.push(menu);
  saveToStorage();
  alert("บันทึกเมนูเรียบร้อยแล้ว");
  document.getElementById("menu-name").value = "";
  document.getElementById("menu-ing-inputs").innerHTML = "";
}

/**
 * ฟังก์ชันดึงข้อมูลเมนูอาหารเดิมขึ้นมาแสดงในส่วนฟอร์มแก้ไขเมนู
 */
function loadMenuToEdit() {
  const menuId = document.getElementById("edit-menu-select").value;
  const container = document.getElementById("edit-menu-container");
  const inputContainer = document.getElementById("edit-menu-ing-inputs");

  if (!menuId) {
    container.style.display = "none";
    return;
  }

  const menu = appData.menus.find((m) => m.id === menuId);
  if (!menu) return;

  document.getElementById("edit-menu-name").value = menu.name;
  inputContainer.innerHTML = "";

  for (let i = 0; i < menu.ingredients.length; i++) {
    addIngredientRow("edit-menu-ing-inputs", menu.ingredients[i]);
  }

  container.style.display = "block";
}

/**
 * ฟังก์ชันอัปเดตบันทึกข้อมูลเมนูที่ผ่านการแก้ไขลงในระบบแทนที่ข้อมูลเดิม (บันทึกตามลำดับปุ่มขึ้นลงด้วย ข้อ 5)
 */
function updateMenu() {
  const menuId = document.getElementById("edit-menu-select").value;
  const name = document.getElementById("edit-menu-name").value.trim();
  if (!menuId || !name) return;

  const index = appData.menus.findIndex((m) => m.id === menuId);
  if (index === -1) return;

  const updatedMenu = { id: menuId, name, ingredients: [] };
  const rows = document.querySelectorAll("#edit-menu-ing-inputs .ing-row");

  for (let i = 0; i < rows.length; i++) {
    const ingName = rows[i].querySelector(".row-ing-name").value;
    const val = parseFloat(rows[i].querySelector(".row-ing-val").value);
    const unit = rows[i].querySelector(".row-ing-unit").value;

    const calcData = convertToStorageUnit(ingName, val, unit);

    updatedMenu.ingredients.push({
      name: ingName,
      displayVal: val,
      displayUnit: unit,
      calcVal: calcData.val,
      calcType: calcData.type,
    });
  }

  appData.menus[index] = updatedMenu;
  saveToStorage();
  alert("แก้ไขข้อมูลเมนูเรียบร้อยแล้ว");
  document.getElementById("edit-menu-select").value = "";
  document.getElementById("edit-menu-container").style.display = "none";
}

/**
 * ฟังก์ชันลบเมนูอาหารออกจากระบบ (ข้อ 3)
 */
function deleteMenu() {
  const menuId = document.getElementById("edit-menu-select").value;
  if (!menuId) return;

  if (
    !confirm(
      "คุณต้องการลบเมนูอาหารนี้ออกจากระบบใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้",
    )
  )
    return;

  appData.menus = appData.menus.filter((m) => m.id !== menuId);
  saveToStorage();
  alert("ลบเมนูอาหารเรียบร้อยแล้ว");
  document.getElementById("edit-menu-select").value = "";
  document.getElementById("edit-menu-container").style.display = "none";
  updateMenuDropdown("edit-menu-select");
}

/**
 * ฟังก์ชันคำนวณแปลงค่าให้เป็นหน่วยสำหรับจัดเก็บ
 */
function convertToStorageUnit(name, val, unit) {
  if (unit === "กิโลกรัม") return { val: val * 1000, type: "weight" };
  if (unit === "กรัม") return { val: val, type: "weight" };
  if (VOL_TO_ML[unit]) {
    return { val: val * VOL_TO_ML[unit], type: "volume" };
  }
  return { val: val, type: "weight" };
}

/**
 * ฟังก์ชันหลักในการคำนวณและปรับเปลี่ยนสัดส่วนเมื่อวัตถุดิบรายการใดรายการหนึ่งเปลี่ยนไป
 */
function recalculateRatio(targetIndex) {
  const rows = document.querySelectorAll("#calc-list tr");
  const targetRow = rows[targetIndex];
  const targetInputVal = parseFloat(
    targetRow.querySelector(".calc-val-input").value,
  );
  const targetUnit = targetRow.querySelector(".calc-unit-select").value;

  if (isNaN(targetInputVal) || targetInputVal <= 0) return;

  const menuId = document.getElementById("calc-menu-select").value;
  const currentMenu = appData.menus.find((m) => m.id === menuId);
  const targetIngBase = currentMenu.ingredients[targetIndex];

  let currentInputInBaseCalcUnit;
  if (targetUnit === "กิโลกรัม")
    currentInputInBaseCalcUnit = targetInputVal * 1000;
  else if (targetUnit === "กรัม") currentInputInBaseCalcUnit = targetInputVal;
  else if (VOL_TO_ML[targetUnit])
    currentInputInBaseCalcUnit = targetInputVal * VOL_TO_ML[targetUnit];

  const ingMeta = appData.ingredients.find(
    (i) => i.name === targetIngBase.name,
  );
  if (ingMeta && ingMeta.vol && ingMeta.weight) {
    const baseMl = ingMeta.vol * VOL_TO_ML[ingMeta.unit];
    if (
      (targetUnit === "กิโลกรัม" || targetUnit === "กรัม") &&
      targetIngBase.calcType === "volume"
    ) {
      currentInputInBaseCalcUnit =
        (currentInputInBaseCalcUnit / ingMeta.weight) * baseMl;
    } else if (VOL_TO_ML[targetUnit] && targetIngBase.calcType === "weight") {
      currentInputInBaseCalcUnit =
        (currentInputInBaseCalcUnit / baseMl) * ingMeta.weight;
    }
  }

  const ratio = currentInputInBaseCalcUnit / targetIngBase.calcVal;
  console.log(ratio);

  for (let i = 0; i < rows.length; i++) {
    if (i === targetIndex) continue;

    const row = rows[i];
    const ingData = currentMenu.ingredients[i];
    const unitSelect = row.querySelector(".calc-unit-select");
    const selectedUnit = unitSelect.value;

    let newCalcVal = ingData.calcVal * ratio;
    let finalDisplayVal = 0;

    if (
      ingData.calcType === "volume" &&
      (selectedUnit === "กิโลกรัม" || selectedUnit === "กรัม")
    ) {
      const meta = appData.ingredients.find((idx) => idx.name === ingData.name);
      const baseMl = meta.vol * VOL_TO_ML[meta.unit];
      newCalcVal = (newCalcVal / baseMl) * meta.weight;
      finalDisplayVal =
        selectedUnit === "กิโลกรัม" ? newCalcVal / 1000 : newCalcVal;
    } else if (ingData.calcType === "weight" && VOL_TO_ML[selectedUnit]) {
      const meta = appData.ingredients.find((idx) => idx.name === ingData.name);
      const baseMl = meta.vol * VOL_TO_ML[meta.unit];
      newCalcVal = (newCalcVal / meta.weight) * baseMl;
      finalDisplayVal = newCalcVal / VOL_TO_ML[selectedUnit];
    } else {
      if (selectedUnit === "กิโลกรัม") finalDisplayVal = newCalcVal / 1000;
      else if (selectedUnit === "กรัม") finalDisplayVal = newCalcVal;
      else if (VOL_TO_ML[selectedUnit])
        finalDisplayVal = newCalcVal / VOL_TO_ML[selectedUnit];
    }

    /* row.querySelector(".calc-val-input").value = Number(
      finalDisplayVal.toFixed(4),
    );*/

    row.querySelector(".calc-val-input").value = formatNumber(finalDisplayVal);
  }
}

/**
 * ฟังก์ชันเปลี่ยนหน่วยแสดงผลเฉพาะตัวของแถววัตถุดิบในหน้าคำนวณ
 */
function handleUnitChange(index) {
  const rows = document.querySelectorAll("#calc-list tr");
  const row = rows[index];
  const selectedUnit = row.querySelector(".calc-unit-select").value;

  const menuId = document.getElementById("calc-menu-select").value;
  const currentMenu = appData.menus.find((m) => m.id === menuId);
  const ingData = currentMenu.ingredients[index];
  const ingMeta = appData.ingredients.find((i) => i.name === ingData.name);

  let currentBaseVal = ingData.calcVal;
  let displayVal = 0;

  if (ingData.calcType === "weight" && VOL_TO_ML[selectedUnit]) {
    const baseMl = ingMeta.vol * VOL_TO_ML[ingMeta.unit];
    currentBaseVal = (currentBaseVal / ingMeta.weight) * baseMl;
    displayVal = currentBaseVal / VOL_TO_ML[selectedUnit];
  } else if (
    ingData.calcType === "volume" &&
    (selectedUnit === "กิโลกรัม" || selectedUnit === "กรัม")
  ) {
    const baseMl = ingMeta.vol * VOL_TO_ML[ingMeta.unit];
    currentBaseVal = (currentBaseVal / baseMl) * ingMeta.weight;
    displayVal =
      selectedUnit === "กิโลกรัม" ? currentBaseVal / 1000 : currentBaseVal;
  } else {
    if (selectedUnit === "กิโลกรัม") displayVal = currentBaseVal / 1000;
    else if (selectedUnit === "กรัม") displayVal = currentBaseVal;
    else if (VOL_TO_ML[selectedUnit])
      displayVal = currentBaseVal / VOL_TO_ML[selectedUnit];
  }

  /* row.querySelector(".calc-val-input").value = Number(displayVal.toFixed(2)); */
  row.querySelector(".calc-val-input").value = formatNumber(displayVal);
  recalculateRatio(index);
}

/**
 * ฟังก์ชันเปลี่ยนหน่วยแสดงผลเฉพาะตัวของแถววัตถุดิบในหน้าคำนวณ
 */
function handleAllUnitChange(event) {
  const selection = event.target;  
  const targetValue = String(selection.value); // ค่าหน่วยที่ต้องการตรวจสอบและเปลี่ยน
  if(targetValue.length==0) return;

  console.log(selection);
  console.log(selection.value);

  // 1. ดึงองค์ประกอบ <select> ทั้งหมดที่มีคลาสเป็น 'calc-unit-select'
  const table = document.getElementById("calc-table");
  const selectElements = table.querySelectorAll(".calc-unit-select");

  // 2. วนลูปตรวจสอบ <select> แต่ละตัว
  selectElements.forEach((select) => {
    // แปลงโครงสร้างตัวเลือก (options) ให้เป็น Array เพื่อใช้เมธอด some ในการตรวจสอบ
    const hasTargetOption = Array.from(select.options).some(
      (option) => option.value === targetValue,
    );

    // 3. เงื่อนไข: ถ้าพบตัวเลือกที่ตรงกับค่าที่กำหนด ให้ทำการเปลี่ยนค่า
    if (hasTargetOption) {
      select.value = targetValue;

      // ส่งสัญญาณบอกเบราว์เซอร์ว่ามีการเปลี่ยนแปลงค่า (ถ้าจำเป็นต้องให้ฟังก์ชัน handleUnitChange ทำงาน)
      select.dispatchEvent(new Event("change"));
    }
  });
}

/**
 * ฟังก์ชันนำเข้าและแสดงผลเมนูอาหารในหน้าคำนวณอัตราส่วน (แสดงผลตามลำดับเดิมที่ตั้งไว้ ข้อ 5)
 */
function loadMenuToCalculate() {
  const menuId = document.getElementById("calc-menu-select").value;
  const menu = appData.menus.find((m) => m.id === menuId);
  const tbody = document.getElementById("calc-list");
  // ตัวเปลี่ยนหน่วยรวม เริ่มต้นใหม่
  document.getElementById("select-all-unit").value = "";
  // ล้างข้อมูลในตารางทั้งหมด
  tbody.innerHTML = "";
  if (!menu) return;

  for (let i = 0; i < menu.ingredients.length; i++) {
    const ing = menu.ingredients[i];
    const meta = appData.ingredients.find((item) => item.name === ing.name);
    const canConvert = meta && meta.vol && meta.weight;

    let unitOptions = "";
    if (canConvert) {
      unitOptions = `
                <option value="กิโลกรัม" ${ing.displayUnit === "กิโลกรัม" ? "selected" : ""}>กิโลกรัม</option>
                <option value="กรัม" ${ing.displayUnit === "กรัม" ? "selected" : ""}>กรัม</option>
                <option value="ช้อนโต๊ะ" ${ing.displayUnit === "ช้อนโต๊ะ" ? "selected" : ""}>ช้อนโต๊ะ</option>
                <option value="ช้อนชา" ${ing.displayUnit === "ช้อนชา" ? "selected" : ""}>ช้อนชา</option>
                <option value="ถ้วย" ${ing.displayUnit === "ถ้วย" ? "selected" : ""}>ถ้วย</option>
                <option value="ลิตร" ${ing.displayUnit === "ลิตร" ? "selected" : ""}>ลิตร</option>
                <option value="มิลลิลิตร" ${ing.displayUnit === "มิลลิลิตร" ? "selected" : ""}>มิลลิลิตร</option>
            `;
    } else {
      if (ing.calcType === "weight") {
        unitOptions = `
                    <option value="กิโลกรัม" ${ing.displayUnit === "กิโลกรัม" ? "selected" : ""}>กิโลกรัม</option>
                    <option value="กรัม" ${ing.displayUnit === "กรัม" ? "selected" : ""}>กรัม</option>
                `;
      } else {
        unitOptions = `
                    <option value="ช้อนโต๊ะ" ${ing.displayUnit === "ช้อนโต๊ะ" ? "selected" : ""}>ช้อนโต๊ะ</option>
                    <option value="ช้อนชา" ${ing.displayUnit === "ช้อนชา" ? "selected" : ""}>ช้อนชา</option>
                    <option value="ถ้วย" ${ing.displayUnit === "ถ้วย" ? "selected" : ""}>ถ้วย</option>
                    <option value="ลิตร" ${ing.displayUnit === "ลิตร" ? "selected" : ""}>ลิตร</option>
                    <option value="มิลลิลิตร" ${ing.displayUnit === "มิลลิลิตร" ? "selected" : ""}>มิลลิลิตร</option>
                `;
      }
    }

    tbody.innerHTML += `
            <tr>
                <td>${ing.name}</td>
                <td><input type="number" class="calc-val-input" value="${ing.displayVal}" step="any" oninput="recalculateRatio(${i})"></td>
                <td>
                    <select class="calc-unit-select" onchange="handleUnitChange(${i})">
                        ${unitOptions}
                    </select>
                </td>
            </tr>
        `;
  }
}

/**
 * ฟังก์ชันระบบส่งออกข้อมูลสำรองภายนอกเป็นไฟล์รูปแบบ JSON
 */
function exportToJSON() {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(appData));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "pwa_recipe_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * ฟังก์ชันนำเข้าข้อมูลและแทนที่ระบบปัจจุบันจาก Text area ของผู้ใช้
 */
function importFromJSON() {
  const jsonStr = document.getElementById("restore-textarea").value.trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.ingredients && parsed.menus) {
      appData = parsed;
      // สั่งจัดเรียงข้อมูลชุดใหม่หลังจากนำเข้าเพื่อความถูกต้อง
      sortByName(appData.ingredients);
      saveToStorage();
      renderIngredients();
      alert("นำเข้าและคืนข้อมูลระบบเสร็จสิ้นสำเร็จแล้ว");
    } else {
      alert("โครงสร้างข้อมูลในไฟล์ JSON ไม่ถูกต้องสอดรับกับแอป");
    }
  } catch (e) {
    alert("รูปแบบ JSON ผิดพลาด กรุณาตรวจสอบอีกครั้ง");
  }
}

function importFromFile(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.ingredients && parsed.menus) {
      appData = parsed;
      // สั่งจัดเรียงข้อมูลชุดใหม่หลังจากนำเข้าเพื่อความถูกต้อง
      sortByName(appData.ingredients);
      saveToStorage();
      renderIngredients();
      alert("นำเข้าและคืนข้อมูลระบบเสร็จสิ้นสำเร็จแล้ว");
    } else {
      alert("โครงสร้างข้อมูลในไฟล์ JSON ไม่ถูกต้องสอดรับกับแอป");
    }
  } catch (e) {
    alert("รูปแบบ JSON ผิดพลาด กรุณาตรวจสอบอีกครั้ง");
  }
}

function saveToStorage() {
  localStorage.setItem("pwa_app_data", JSON.stringify(appData));
}
function loadFromStorage() {
  const stored = localStorage.getItem("pwa_app_data");
  if (stored) {
    appData = JSON.parse(stored);
    sortByName(appData.ingredients); // เรียงตามชื่อวัตถุดิบ (ข้อ 2)
    renderIngredients();
  }
}

/**
 * ฟังก์ชันปรับปรุงและจัดเรียงข้อมูลในกล่องตัวเลือกเมนูอาหารตามตัวอักษรไทย-อังกฤษ (ข้อ 4, 6 และ 7)
 */
function updateMenuDropdown(id) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">-- เลือกเมนูอาหาร --</option>';

  // ทำการคัดลอกอาเรย์แล้วจัดเรียงตามหลักภาษาไทย/อังกฤษก่อนแสดงผลในตัวเลือก
  const sortedMenus = [...appData.menus];
  sortByName(sortedMenus);

  for (let i = 0; i < sortedMenus.length; i++) {
    select.innerHTML += `<option value="${sortedMenus[i].id}">${sortedMenus[i].name}</option>`;
  }
}

window.onload = function () {
  loadFromStorage();

  document
    .getElementById("jsonFile")
    .addEventListener("change", async (event) => {
      const file = event.target.files[0];

      if (!file) return;

      const text = await file.text();
      importFromFile(text);
    });
};

/// เมื่อผู้ใช้กดปุ่ม ยกเลิก ในหน้า จัดการวัตถุดิบ
function resetIngredient(event) {
  document.getElementById("ing-id").value = "";
  document.getElementById("ing-submit").innerText = "เพิ่มวัตถุดิบ";
}

/// จัดรูปแบบตัวเลขที่แสดงผลเมื่อแปลงหน่วย ให้ทศนิยมไม่เกิน 4 ตัวแหน่ง
function formatNumber(num) {
    // หาจำนวนหลักของตัวเลขหน้าทศนิยม (ไม่รวมเครื่องหมายลบและจุดทศนิยม)
    const integerLength = Math.floor(Math.abs(num)).toString().length;
    
    // คำนวณจำนวนตำแหน่งทศนิยมสูงสุดที่ยอมรับให้แสดงผล
    let maxDecimals = 0;
    if (integerLength === 1) {
        maxDecimals = num >= 1 || num <= -1 ? 3 : 4;
    } else if (integerLength === 2) {
        maxDecimals = 2;
    } else if (integerLength === 3) {
        maxDecimals = 1;
    } else {
        maxDecimals = 0;
    }

    // จัดรูปแบบตัวเลขตามเงื่อนไขที่คำนวณได้
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDecimals,
        useGrouping: false // กำหนดเป็น true หากต้องการให้มีเครื่องหมายจุลภาค (,) แยกหลักพัน
    }).format(num);
}