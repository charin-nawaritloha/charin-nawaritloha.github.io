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

  if (viewId === "view-ingredients") {
    renderIngredients();
    return;
  }

  if (viewId === "view-edit-menu") {
    updateMenuDropdown("edit-menu-select");
    document.getElementById("edit-menu-ing-text").style.display = "none";
    document.getElementById("salt-sugar-cal-note1").style.display = "none";
    loadMenuToEdit();
    return;
  }

  if (viewId === "view-calc") {
    updateMenuDropdown("calc-menu-select");
    loadMenuToCalculate();
    return;
  }

  if (viewId === "view-backup") {
    updateExportDropdown();
    return;
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

  const {saltValues, sugarValues,  saltPercent, sugarPercent } = calcNutritionPercent();

  const ingData = {
    id: id || Date.now().toString(),
    name,
    vol,
    unit,
    weight,
    saltValues,
    sugarValues,
    saltPercent,
    sugarPercent,
  };

  // ตรวจสอบว่ามีชื่อซ้ำหรือไม่
  if (id) {
    const index = appData.ingredients.findIndex((item) => item.id === id);
    if (index !== -1) {
      if (appData.ingredients[index].name === ingData.name) {
        // ใช้ชื่อเดิม ไม่ต้องตรวจชื่อซ้ำ
        appData.ingredients[index] = ingData;
      } else {
        // ตรวจสอบว่าชื่อที่เปลี่ยนไปซ้ำกับรายการอื่นหรือไม่
        // ตรวจสอบชื่อเฉพาะรายการที่เป็น id อื่น ๆ
        const matchSameName = appData.ingredients.filter((item) =>
          item.id === id ? false : item.name === name,
        );
        if (matchSameName.length > 0) {
          alert(
            `❌ เกิดความผิดพลาด ชื่อวัตถุดิบที่เปลี่ยน [${name}] ซ้ำกับรายการอื่น\n`,
          );
          return;
        }
        // ตรวจแล้วชื่อไม่ซ้ำ
        appData.ingredients[index] = ingData;
      }
    } else {
      alert(
        "❌ เกิดความผิดพลาด ไม่พบ id ของรายการวัตถุดิบที่บันทึก\n" +
          "id: " +
          id,
      );
      return;
    }
  } else {
    // ตรวจสอบว่าชื่อรายการใหม่ซ้ำกับรายการอื่นหรือไม่
    const matchSameName = appData.ingredients.filter(
      (item) => item.name === name,
    );
    if (matchSameName.length > 0) {
      alert(
        `❌ เกิดความผิดพลาด ชื่อวัตถุดิบที่ระบุ [${name}] ซ้ำกับรายการอื่น\n`,
      );
      return;
    }

    appData.ingredients.push(ingData);
  }

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

  const saltValues = item.saltValues ?? ["", ""];
  const sugarValues = item.sugarValues ?? ["", ""];

  document.getElementById("ing-list-salt-min").value = saltValues[0];
  document.getElementById("ing-list-salt-max").value = saltValues[1];
  document.getElementById("ing-list-sugar-min").value = sugarValues[0];
  document.getElementById("ing-list-sugar-max").value = sugarValues[1];

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

    let nutriParts = [];
    if (item.saltPercent !== null && item.saltPercent !== undefined) {
      nutriParts.push(`เกลือ: ${formatNumber(item.saltPercent)}%`);
    }
    if (item.sugarPercent !== null && item.sugarPercent !== undefined) {
      nutriParts.push(`น้ำตาล: ${formatNumber(item.sugarPercent)}%`);
    }
    const nutriText =
      nutriParts.length > 0
        ? `<div class="nutri-percent">${nutriParts.join(" ")}</div>`
        : "";

    tbody.innerHTML += `<tr>
            <td>${item.name}${nutriText}</td>
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

  // 1. อ้างอิงถึงแท็ก datalist ใน HTML
  const datalist = document.getElementById("ingredient-list");
  datalist.innerHTML = "";

  // 2. วนลูปข้อมูลใน array เพื่อสร้างแท็ก <option>
  appData.ingredients.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name; // กำหนดค่าเป็น name เพื่อให้แสดงในรายการเลือก
    datalist.appendChild(option); // เพิ่ม option เข้าไปใน datalist
  });

  const ingName = data && data.name ? data.name : "";
  const val = data ? data.displayVal : "";
  const unit = data ? data.displayUnit : "";

  div.innerHTML = `
        <button type="button" onclick="moveRow(this, 'up')">▲</button><button type="button" onclick="moveRow(this, 'down')">▼</button>
        <input type="checkbox" class="row-ing-include" checked onchange="recalculateSaltSugarInEditMenu()">
        <input type="text" class="row-ing-name" list="ingredient-list" placeholder="พิมพ์ชื่อวัตถุดิบ..." value="${ingName}">
        <input type="number" class="row-ing-val" placeholder="จำนวน" step="any" value="${val}" required oninput="recalculateSaltSugarInEditMenu()">
        <input type="text" class="row-ing-unit" list="unit-list" placeholder="หน่วยวัด..." value="${unit}" oninput="recalculateSaltSugarInEditMenu()">
        <button type="button" onclick="this.parentElement.remove(); recalculateSaltSugarInEditMenu();" class="delete-button">ลบ</button>
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
 * ฟังก์ชันคำนวณน้ำหนัก (กรัม) ของวัตถุดิบในแถวที่ระบุสำหรับหน้าแก้ไขเมนู
 * จะคืนค่า null หากไม่สามารถแปลงเป็นน้ำหนักได้
 */
function calcRowWeightGramsFromEditMenu(row, ingName) {
  const val = parseFloat(row.querySelector(".row-ing-val").value);
  const unit = row.querySelector(".row-ing-unit").value;

  if (isNaN(val)) return null;

  if (unit === "กิโลกรัม") return val * 1000;
  if (unit === "กรัม") return val;

  if (VOL_TO_ML[unit]) {
    const meta = appData.ingredients.find((m) => m.name === ingName);
    if (meta && meta.vol && meta.weight) {
      const baseMl = meta.vol * VOL_TO_ML[meta.unit];
      const ml = val * VOL_TO_ML[unit];
      return (ml / baseMl) * meta.weight;
    }
    return null; // ไม่มีข้อมูลแปลงปริมาตรเป็นน้ำหนัก
  }

  return null; // หน่วยอื่นที่ไม่สามารถแปลงเป็นน้ำหนักได้
}

/**
 * ฟังก์ชันคำนวณ % เกลือและน้ำตาลรวมของเมนูในหน้าแก้ไขเมนู จากวัตถุดิบที่ถูกเลือกด้วย checkbox เท่านั้น
 */
function recalculateSaltSugarInEditMenu() {
  const resultList = document.getElementById("edit-menu-salt-sugar-result");
  if (!resultList) return; // ถ้าไม่มีพื้นที่แสดงผลให้ยกเลิก

  const rows = document.querySelectorAll("#edit-menu-ing-inputs .ing-row");
  let totalWeight = 0;
  let usedCount = 0,
    noUsedCount = 0;
  let saltWeight = 0;
  let sugarWeight = 0;
  let noWeightLists = [];

  rows.forEach((row) => {
    const checkbox = row.querySelector(".row-ing-include");
    if (!checkbox || !checkbox.checked) {
      ++noUsedCount;
      return;
    }

    const ingName = row.querySelector(".row-ing-name").value.trim();
    if (ingName === "") {
      ++noUsedCount;
      return;
    }

    const grams = calcRowWeightGramsFromEditMenu(row, ingName);
    if (grams === null) {
      noWeightLists.push(ingName);
      return;
    }

    totalWeight += grams;
    usedCount++;

    const meta = appData.ingredients.find((m) => m.name === ingName);
    const saltPercent =
      meta && meta.saltPercent !== null && meta.saltPercent !== undefined
        ? meta.saltPercent
        : 0;
    const sugarPercent =
      meta && meta.sugarPercent !== null && meta.sugarPercent !== undefined
        ? meta.sugarPercent
        : 0;

    saltWeight += (grams * saltPercent) / 100;
    sugarWeight += (grams * sugarPercent) / 100;
  });

  const saltPercent = totalWeight > 0 ? (saltWeight / totalWeight) * 100 : 0;
  const sugarPercent = totalWeight > 0 ? (sugarWeight / totalWeight) * 100 : 0;

  const output = `
        <li>เกลือ: ${formatNumber(saltPercent.toFixed(2))} %, น้ำหนักรวม ${formatWeightAuto(saltWeight)}</li>
        <li>น้ำตาล: ${formatNumber(sugarPercent.toFixed(2))} %, น้ำหนักรวม ${formatWeightAuto(sugarWeight)}</li>
        <li>วัตถุดิบที่ใช้คำนวณ: ${usedCount} รายการ หนักรวม ${formatWeightAuto(totalWeight)}</li>
        <li>วัตถุดิบที่ไม่เลือกมาคำนวณ: ${noUsedCount} รายการ</li>`;

  if (noWeightLists.length > 0) {
    resultList.innerHTML = output.concat(
      `<li>วัตถุดิบที่ไม่มีข้อมูลน้ำหนัก: ${noWeightLists.length} รายการ (${noWeightLists.join(", ")})</li>`,
    );
  } else {
    resultList.innerHTML = output;
  }
}

/**
 * ฟังก์ชันสร้างเมนูอาหารใหม่ ผ่านการกรอกชื่อเมนูในกล่องโต้ตอบ
 * แล้วเลือกเมนูใหม่ขึ้นมาในหน้าแก้ไขเมนูอาหารทันที
 */
function addNewMenu() {
  let name = "";
  while (true) {
    name = prompt("กรุณาระบุชื่อเมนูใหม่:");
    if (name === null) return; // ผู้ใช้กดยกเลิก
    name = name.trim();

    if (name === "") {
      alert("⚠️ กรุณาระบุชื่อเมนู");
      continue;
    }

    const isDuplicate = appData.menus.some((m) => m.name === name);
    if (isDuplicate) {
      alert("⚠️ ชื่อเมนูนี้มีอยู่แล้วในระบบ กรุณาระบุชื่ออื่น");
      continue;
    }
    break;
  }

  const menu = {
    id: Date.now().toString(),
    name,
    linkWeb: "",
    note: "",
    ingredients: [],
  };
  appData.menus.push(menu);
  saveToStorage();

  updateMenuDropdown("edit-menu-select");
  document.getElementById("edit-menu-select").value = menu.id;
  loadMenuToEdit();
}

/**
 * ฟังก์ชันดึงข้อมูลเมนูอาหารเดิมขึ้นมาแสดงในส่วนฟอร์มแก้ไขเมนู
 */
function loadMenuToEdit() {
  // ทำการซ่อนส่วนของการนำเข้าวัตถุดิบจำนวนมากทุกครั้งที่เปลี่ยนเมนู
  document.getElementById("edit-menu-ing-text").style.display = "none";

  const menuId = document.getElementById("edit-menu-select").value;
  const container = document.getElementById("edit-menu-container");
  const inputContainer = document.getElementById("edit-menu-ing-inputs"); // ส่วนผสม
  const linkWeb = document.getElementById("edit-menu-link");
  const note = document.getElementById("edit-menu-note");

  if (!menuId) {
    document.getElementById("edit-menu-name").value = "";
    linkWeb.value = "";
    note.value = "";
    inputContainer.innerText = "";
    container.style.display = "none";
    document.getElementById("edit-menu-salt-sugar-section").style.display =
      "none";
    return;
  }

  const menu = appData.menus.find((m) => m.id === menuId);
  if (!menu) return;

  container.style.display = "block";
  document.getElementById("edit-menu-name").value = menu.name;
  inputContainer.innerText = ""; // ล้างข้อมูล ส่วนผสม
  linkWeb.value = menu.linkWeb ?? "";
  note.value = menu.note ?? "";

  // แสดงส่วนแสดงผลเกลือและน้ำตาล
  document.getElementById("edit-menu-salt-sugar-section").style.display =
    "block";

  for (let i = 0; i < menu.ingredients.length; i++) {
    addIngredientRow("edit-menu-ing-inputs", menu.ingredients[i]);
  }

  // เรียกคำนวณเกลือและน้ำตาลหลังจากโหลดเมนูเสร็จ
  recalculateSaltSugarInEditMenu();
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

  const isDuplicate = appData.menus.some((m) =>
    menuId === m.id ? false : m.name === name,
  );

  if (isDuplicate) {
    alert("❌ ชื่อเมนูที่แก้ไขใหม่ มีอยู่แล้วในระบบ กรุณาระบุชื่ออื่น");
    return;
  }

  const linkWeb = document.getElementById("edit-menu-link").value.trim();
  const note = document.getElementById("edit-menu-note").value.trim();
  const updatedMenu = { id: menuId, name, linkWeb, note, ingredients: [] };
  const rows = document.querySelectorAll("#edit-menu-ing-inputs .ing-row");

  for (let i = 0; i < rows.length; i++) {
    const ingName = String(rows[i].querySelector(".row-ing-name").value).trim();
    const val = parseFloat(rows[i].querySelector(".row-ing-val").value);
    const unit = String(rows[i].querySelector(".row-ing-unit").value).trim();

    const calcData = convertToStorageUnit(ingName, val, unit);

    updatedMenu.ingredients.push({
      name: ingName,
      displayVal: val,
      displayUnit: unit,
      calcVal: calcData.val,
      calcType: calcData.type,
    });

    addIngredientIfAbsent(ingName);
  }

  appData.menus[index] = updatedMenu;
  saveToStorage();
  alert("✅ แก้ไขข้อมูลเมนูเรียบร้อยแล้ว");
  document.getElementById("edit-menu-select").value = "";
  loadMenuToEdit();
}

/// สำเนาเมนู โดยจะต่อชื่อเมนูใหม่ด้วย (Copy ##)
function duplicateMenu() {
  const menuId = document.getElementById("edit-menu-select").value;
  const menu = appData.menus.find((m) => m.id === menuId);
  if (!menu) return;

  let newName = menu.name + " (Copy 1)";
  let counter = 2;
  while (appData.menus.some((m) => m.name === newName)) {
    newName = `${menu.name} (Copy ${counter})`;
    counter++;
  }

  const copyMenu = {
    id: String(
      Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
    ),
    name: newName,
    linkWeb: menu.linkWeb ?? "",
    note: menu.note ?? "",
    ingredients: [...menu.ingredients]
  };

  appData.menus.push(copyMenu);
  saveToStorage();

  // ทำการเพิ่มรายการ ต่อท้ายตัวเลือกเมนูชั่วคราว
  const select = document.getElementById('edit-menu-select');
  const current = select.value;
  select.innerHTML += `<option value="${copyMenu.id}">${copyMenu.name}</option>`;  
  select.value = current;

  alert(`✅ ทำการสำเนาเมนูอาหาร ${menu.name} → ${newName} เรียบร้อยแล้ว`);
}

/**
 * ฟังก์ชันลบเมนูอาหารออกจากระบบ (ข้อ 3)
 */
function deleteMenu() {
  const menuId = document.getElementById("edit-menu-select").value;

  if (!menuId) return;

  if (
    !confirm(
      "❓ คุณต้องการลบเมนูอาหารนี้ออกจากระบบใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้",
    )
  )
    return;

  appData.menus = appData.menus.filter((m) => m.id !== menuId);

  saveToStorage();

  alert("✅ ลบเมนูอาหารเรียบร้อยแล้ว");
  document.getElementById("edit-menu-select").value = "";
  updateMenuDropdown("edit-menu-select");
  loadMenuToEdit();
}

/**
 * ฟังก์ชันคำนวณแปลงค่าให้เป็นหน่วยสำหรับจัดเก็บ
 */
function convertToStorageUnit(name, val, unit) {
  if (unit === "กิโลกรัม") return { val: val * 1000, type: "weight" };

  if (unit === "กรัม") return { val: val, type: "weight" };

  if (VOL_TO_ML[unit]) return { val: val * VOL_TO_ML[unit], type: "volume" };

  return { val: val, type: "custom" };
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

  // ตรวจสอบว่ามีการแปลงหน่วยจากที่ระบุเมนูหรือไม่ ถ้ามีให้แปลงตามหน่วยที่เลือก
  if (targetUnit === "กิโลกรัม")
    currentInputInBaseCalcUnit = targetInputVal * 1000;
  else if (targetUnit === "กรัม") currentInputInBaseCalcUnit = targetInputVal;
  else if (VOL_TO_ML[targetUnit])
    currentInputInBaseCalcUnit = targetInputVal * VOL_TO_ML[targetUnit];
  else currentInputInBaseCalcUnit = targetInputVal;

  // ตรวจสอบว่ามีข้อมูลการแปลงระหว่างปริมาตรกับน้ำหนักหรือไม่
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

  // คำนวณอัตราส่วนใหม่ จากค่าเดิมที่ระบุไว้ในเมนู
  const ratio = currentInputInBaseCalcUnit / targetIngBase.calcVal;
  document.getElementById("ingr-ratio").value = ratio.toFixed(1);

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
      else finalDisplayVal = newCalcVal;
    }

    row.querySelector(".calc-val-input").value = formatNumber(finalDisplayVal);
  }

  maybeUpdateSaltSugar();
}

/**
 * ฟังก์ชันหลักในการคำนวณและปรับเปลี่ยนสัดส่วนเมื่อวัตถุดิบรายการใดรายการหนึ่งเปลี่ยนไป
 */
function setCalculateRatio(event) {
  const ratio = parseFloat(event.target.value);
  if (isNaN(ratio) || ratio <= 0) return;

  const rows = document.querySelectorAll("#calc-list tr");
  const menuId = document.getElementById("calc-menu-select").value;
  const currentMenu = appData.menus.find((m) => m.id === menuId);

  for (let i = 0; i < rows.length; i++) {
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
      else finalDisplayVal = newCalcVal;
    }

    row.querySelector(".calc-val-input").value = formatNumber(finalDisplayVal);
  }

  maybeUpdateSaltSugar();
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

  row.querySelector(".calc-val-input").value = formatNumber(displayVal);
  recalculateRatio(index);
  maybeUpdateSaltSugar();
}

/**
 * ฟังก์ชันเปลี่ยนหน่วยแสดงผลเฉพาะตัวของแถววัตถุดิบในหน้าคำนวณ
 */
function handleAllUnitChange(event) {
  const selection = event.target;
  const targetValue = String(selection.value); // ค่าหน่วยที่ต้องการตรวจสอบและเปลี่ยน
  if (targetValue.length == 0) return;

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
 * ฟังก์ชันนำเข้าและแสดงผลเมนูอาหารในหน้าคำนวณอัตราส่วน
 */
function loadMenuToCalculate() {
  const menuId = document.getElementById("calc-menu-select").value;
  const menu = appData.menus.find((m) => m.id === menuId);
  const linkWeb = String(menu?.linkWeb ?? "");
  const note = String(menu?.note ?? "");
  const tbody = document.getElementById("calc-list");
  const calcOption = document.getElementById("calc-menu-instruction");
  // ตัวเปลี่ยนหน่วยรวม เริ่มต้นใหม่
  document.getElementById("select-all-unit").value = "";
  document.getElementById("ingr-ratio").value = "1";
  // ล้างข้อมูลในตารางทั้งหมด
  tbody.innerHTML = "";
  // แสดง link ถ้ามี
  if (linkWeb.startsWith("http")) {
    const hostname = new URL(linkWeb).hostname;
    document.getElementById("calc-menu-link").innerHTML =
      `วิธีปรุง: <a href="${linkWeb}" target="_blank">${hostname}</a>`;
  } else {
    document.getElementById("calc-menu-link").innerText = "";
  }
  // แสดง note ถ้ามี
  document.getElementById("calc-menu-note").innerText =
    note.length > 0 ? "⚠️ " + note : "";
  // ปิดในส่วนตัวเลือกในการคำนวณ
  calcOption.style.display = "none";
  document.getElementById("calc-view").value = "ปกติ";
  document.getElementById("calc-salt-sugar").style.display = "none";
  document.getElementById("calc-table").classList.remove("show-cal-include");

  if (!menu) return;

  calcOption.style.display = "block";

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
      } else if (ing.calcType === "volume") {
        unitOptions = `
                <option value="ช้อนโต๊ะ" ${ing.displayUnit === "ช้อนโต๊ะ" ? "selected" : ""}>ช้อนโต๊ะ</option>
                <option value="ช้อนชา" ${ing.displayUnit === "ช้อนชา" ? "selected" : ""}>ช้อนชา</option>
                <option value="ถ้วย" ${ing.displayUnit === "ถ้วย" ? "selected" : ""}>ถ้วย</option>
                <option value="ลิตร" ${ing.displayUnit === "ลิตร" ? "selected" : ""}>ลิตร</option>
                <option value="มิลลิลิตร" ${ing.displayUnit === "มิลลิลิตร" ? "selected" : ""}>มิลลิลิตร</option>
            `;
      } else {
        unitOptions = `
                    <option value="${ing.displayUnit}" selected>${ing.displayUnit}</option>
                `;
      }
    }

    tbody.innerHTML += `
            <tr>
                <td><input type="checkbox" class="cal-include" checked onchange="calculateSaltSugar()"></td>
                <td>${ing.name}</td>
                <td><input type="number" class="calc-val-input" value="${ing.displayVal}" step="any" oninput="recalculateRatio(${i})" onfocus="this.select()"></td>
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
 * ฟังก์ชันสำเร็จรูปสำหรับเรียกคำนวณเกลือ/น้ำตาลใหม่ เฉพาะเมื่อมุมมองปัจจุบันคือ "เกลือและน้ำตาล"
 */
function maybeUpdateSaltSugar() {
  const view = document.getElementById("calc-view");
  if (view && view.value === "เกลือและน้ำตาล") {
    calculateSaltSugar();
  }
}

/**
 * ฟังก์ชันสลับมุมมองระหว่าง "ปกติ" และ "เกลือและน้ำตาล" ในหน้าคำนวณอัตราส่วน
 */
function changeViewToCalculate() {
  const view = document.getElementById("calc-view").value;
  const saltSugarSection = document.getElementById("calc-salt-sugar");
  const table = document.getElementById("calc-table");

  if (view === "เกลือและน้ำตาล") {
    saltSugarSection.style.display = "block";
    table.classList.add("show-cal-include");
    document.getElementById("salt-sugar-cal-note2").style.display = "none";
    document.getElementById("toggle-cal-include").checked = true;
    table
      .querySelectorAll("#calc-list .cal-include")
      .forEach((checkbox) => (checkbox.checked = true));
    calculateSaltSugar();
  } else {
    saltSugarSection.style.display = "none";
    table.classList.remove("show-cal-include");
  }
}

/**
 * ฟังก์ชันสลับเปิด/ปิดข้อความคำแนะนำในส่วนคำนวณเกลือและน้ำตาล
 */
function toggleSaltSugarCalNote(no) {
  const note = document.getElementById("salt-sugar-cal-note" + no.toString());
  if (note)
    note.style.display = note.style.display === "none" ? "block" : "none";
}

/**
 * ฟังก์ชันเลือกหรือยกเลิกการเลือก checkbox วัตถุดิบทั้งหมดในตารางคำนวณ
 */
function toggleCalInclude() {
  const headerChecked = document.getElementById("toggle-cal-include").checked;
  document
    .querySelectorAll("#calc-list .cal-include")
    .forEach((checkbox) => (checkbox.checked = headerChecked));
  calculateSaltSugar();
}

/**
 * ฟังก์ชันคำนวณน้ำหนัก (กรัม) ของวัตถุดิบในแถวที่ระบุ โดยอ้างอิงจากค่าและหน่วยที่แสดงผลอยู่ ณ ขณะนั้น
 * จะคืนค่า null หากไม่สามารถแปลงเป็นน้ำหนักได้
 */
function calcRowWeightGrams(row, ingData) {
  const val = parseFloat(row.querySelector(".calc-val-input").value);
  const unit = row.querySelector(".calc-unit-select").value;

  if (isNaN(val)) return null;

  if (unit === "กิโลกรัม") return val * 1000;
  if (unit === "กรัม") return val;

  if (VOL_TO_ML[unit]) {
    const meta = appData.ingredients.find((m) => m.name === ingData.name);
    if (meta && meta.vol && meta.weight) {
      const baseMl = meta.vol * VOL_TO_ML[meta.unit];
      const ml = val * VOL_TO_ML[unit];
      return (ml / baseMl) * meta.weight;
    }
    return null; // ไม่มีข้อมูลแปลงปริมาตรเป็นน้ำหนัก
  }

  return null; // หน่วยอื่นที่ไม่สามารถแปลงเป็นน้ำหนักได้
}

/**
 * ฟังก์ชันจัดรูปแบบน้ำหนัก (กรัม) ให้แสดงผลด้วยหน่วยที่เหมาะสม กิโลกรัม > กรัม > มิลลิกรัม
 */
function formatWeightAuto(grams) {
  if (!grams || grams <= 0) return "0 กรัม";

  if (grams / 1000 >= 1) return formatNumber(grams / 1000) + " กิโลกรัม";
  if (grams >= 1) return formatNumber(grams) + " กรัม";
  return formatNumber(grams * 1000) + " มิลลิกรัม";
}

/**
 * ฟังก์ชันคำนวณ % เกลือและน้ำตาลรวมของเมนู จากวัตถุดิบที่ถูกเลือกด้วย checkbox เท่านั้น
 */
function calculateSaltSugar() {
  const menuId = document.getElementById("calc-menu-select").value;
  const currentMenu = appData.menus.find((m) => m.id === menuId);
  const resultList = document.getElementById("calc-salt-sugar-result");
  if (!currentMenu) return;

  const rows = document.querySelectorAll("#calc-list tr");
  let totalWeight = 0;
  let usedCount = 0,
    noUsedCount = 0;
  let saltWeight = 0;
  let sugarWeight = 0;
  let noWeightLists = [];

  rows.forEach((row, i) => {
    const checkbox = row.querySelector(".cal-include");
    if (!checkbox || !checkbox.checked) {
      ++noUsedCount;
      return;
    }

    const ingData = currentMenu.ingredients[i];
    const grams = calcRowWeightGrams(row, ingData);
    if (grams === null) {
      noWeightLists.push(ingData.name);
      return;
    }

    totalWeight += grams;
    usedCount++;

    const meta = appData.ingredients.find((m) => m.name === ingData.name);
    if (meta && meta.saltPercent !== null && meta.saltPercent !== undefined) {
      saltWeight += (grams * meta.saltPercent) / 100;
    }
    if (meta && meta.sugarPercent !== null && meta.sugarPercent !== undefined) {
      sugarWeight += (grams * meta.sugarPercent) / 100;
    }
  });

  const saltPercent = totalWeight > 0 ? (saltWeight / totalWeight) * 100 : 0;
  const sugarPercent = totalWeight > 0 ? (sugarWeight / totalWeight) * 100 : 0;

  const output = `
        <li>เกลือ: ${formatNumber(saltPercent.toFixed(2))} %, น้ำหนักรวม ${formatWeightAuto(saltWeight)}</li>
        <li>น้ำตาล: ${formatNumber(sugarPercent.toFixed(2))} %, น้ำหนักรวม ${formatWeightAuto(sugarWeight)}</li>
        <li>วัตถุดิบที่ใช้คำนวณ: ${usedCount} รายการ หนักรวม ${formatWeightAuto(totalWeight)}</li>
        <li>วัตถุดิบที่ไม่เลือกมาคำนวณ: ${noUsedCount} รายการ</li>`;

  if (noWeightLists.length > 0) {
    resultList.innerHTML = output.concat(
      `<li>วัตถุดิบที่ไม่มีข้อมูลน้ำหนัก: ${noWeightLists.length} รายการ (${noWeightLists.join(", ")})</li>`,
    );
  } else {
    resultList.innerHTML = output;
  }
}

/**
 * ฟังก์ชันปรับปรุงรายการตัวเลือกเมนูอาหารในกล่องเลือกชนิดข้อมูลที่จะส่งออก
 * โดยคงค่าเริ่มต้น "-- ข้อมูลทั้งหมด --" ไว้เสมอ
 */
function updateExportDropdown() {
  const select = document.getElementById("export-data-type");
  select.innerHTML = '<option value="">-- ข้อมูลทั้งหมด --</option>';

  const sortedMenus = [...appData.menus];
  sortByName(sortedMenus);

  for (let i = 0; i < sortedMenus.length; i++) {
    select.innerHTML += `<option value="${sortedMenus[i].id}">${sortedMenus[i].name}</option>`;
  }
}

/**
 * ฟังก์ชันระบบส่งออกข้อมูลสำรองภายนอกเป็นไฟล์รูปแบบ JSON
 * หากเลือก "ข้อมูลทั้งหมด" จะส่งออกข้อมูลทั้งระบบ
 * หากเลือกเมนูใดเมนูหนึ่ง จะส่งออกเฉพาะเมนูนั้นและวัตถุดิบที่เกี่ยวข้องเท่านั้น
 */
function exportToJSON() {
  const selectedMenuId = document.getElementById("export-data-type").value;

  let exportData = appData;
  let filename = "สำเนา_เมนูอาหาร.json";

  if (selectedMenuId) {
    const menu = appData.menus.find((m) => m.id === selectedMenuId);
    if (!menu) {
      alert("⚠️ ไม่พบเมนูอาหารที่เลือก");
      return;
    }

    const relatedIngredients = appData.ingredients.filter((ing) =>
      menu.ingredients.some((mi) => mi.name === ing.name),
    );

    exportData = { ingredients: relatedIngredients, menus: [menu] };

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    filename = `สำเนา_เมนู${menu.name}_${dateStr}.json`;
  }

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportData));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * ฟังก์ชันสร้าง id ใหม่ที่ไม่ซ้ำกับ id ที่มีอยู่แล้วในระบบ
 */
function generateUniqueId(existingIds) {
  let id;
  do {
    id = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
  } while (existingIds.includes(id));
  return id;
}

/**
 * ฟังก์ชันนำข้อมูลที่นำเข้ามารวม (merge) เข้ากับข้อมูลเดิมในระบบ
 * - วัตถุดิบ: หากชื่อซ้ำกับที่มีอยู่แล้ว จะข้ามไม่นำเข้า และเก็บรายชื่อที่ถูกข้ามไว้แจ้งเตือน
 * - เมนู: หากชื่อซ้ำกับที่มีอยู่แล้ว จะเปลี่ยนชื่อโดยเติม (Copy N) ต่อท้ายจนกว่าจะไม่ซ้ำ
 * - รายการที่นำเข้าใหม่ทั้งหมดจะได้รับ id ใหม่เสมอ
 */
function mergeImportedData(parsed) {
  const skippedIngredients = [];
  let addedIngredientsCount = 0;
  let addedMenusCount = 0;

  if (Array.isArray(parsed.ingredients)) {
    parsed.ingredients.forEach((ing) => {
      const exists = appData.ingredients.some((item) => item.name === ing.name);
      if (exists) {
        skippedIngredients.push(ing.name);
        return;
      }
      const existingIds = appData.ingredients.map((item) => item.id);
      const newId = generateUniqueId(existingIds);
      appData.ingredients.push({ ...ing, id: newId });
      addedIngredientsCount++;
    });
  }

  if (Array.isArray(parsed.menus)) {
    parsed.menus.forEach((menu) => {
      let newName = menu.name;
      let counter = 1;
      while (appData.menus.some((m) => m.name === newName)) {
        newName = `${menu.name} (Copy ${counter})`;
        counter++;
      }
      const existingIds = appData.menus.map((m) => m.id);
      const newId = generateUniqueId(existingIds);
      appData.menus.push({ ...menu, id: newId, name: newName });
      addedMenusCount++;
    });
  }

  sortByName(appData.ingredients);
  sortByName(appData.menus);
  saveToStorage();

  let message = `✅ นำเข้าข้อมูลแบบเพิ่มเป็นข้อมูลใหม่เรียบร้อยแล้ว\nเมนูที่เพิ่ม: ${addedMenusCount} รายการ\nวัตถุดิบที่เพิ่ม: ${addedIngredientsCount} รายการ`;
  if (skippedIngredients.length > 0) {
    message += `\nวัตถุดิบที่ข้ามเนื่องจากชื่อซ้ำ: ${skippedIngredients.length} รายการ (${skippedIngredients.join(", ")})`;
  }
  alert(message);
}

/**
 * ฟังก์ชันประมวลผลข้อมูลที่นำเข้า ตามโหมดที่ระบุ (merge หรือ replace)
 */
function processImportedData(parsed, mode) {
  if (!parsed || !parsed.ingredients || !parsed.menus) {
    alert("❌ โครงสร้างข้อมูลในไฟล์ JSON ไม่ถูกต้องสอดรับกับแอป");
    return;
  }

  if (mode === "replace") {
    appData = parsed;
    sortByName(appData.ingredients);
    sortByName(appData.menus);
    saveToStorage();
    alert("✅ นำเข้าและคืนข้อมูลระบบเสร็จสิ้นสำเร็จแล้ว");
  } else {
    mergeImportedData(parsed);
  }
}

/**
 * ฟังก์ชันนำเข้าข้อมูลและแทนที่ระบบปัจจุบันจาก Text area ของผู้ใช้
 */
function importFromJSON() {
  const jsonStr = document.getElementById("restore-textarea").value.trim();
  const mode = document.getElementById("import-from-textarea").value;
  try {
    const parsed = JSON.parse(jsonStr);
    processImportedData(parsed, mode);
  } catch (e) {
    alert("❌ รูปแบบ JSON ผิดพลาด กรุณาตรวจสอบอีกครั้ง");
  }
}

function importFromFile(jsonStr) {
  const mode = document.getElementById("import-from-file").value;
  try {
    const parsed = JSON.parse(jsonStr);
    processImportedData(parsed, mode);
  } catch (e) {
    alert("❌ รูปแบบ JSON ผิดพลาด กรุณาตรวจสอบอีกครั้ง");
  }
}

function saveToStorage() {
  localStorage.setItem("pwa_app_data", JSON.stringify(appData));
}

function loadFromStorage() {
  const stored = localStorage.getItem("pwa_app_data");
  if (stored) {
    appData = JSON.parse(stored);
    sortByName(appData.ingredients);
  }
}

/**
 * ฟังก์ชันปรับปรุงและจัดเรียงข้อมูลในกล่องตัวเลือกเมนูอาหารตามตัวอักษรไทย-อังกฤษ
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
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
    useGrouping: false, // กำหนดเป็น true หากต้องการให้มีเครื่องหมายจุลภาค (,) แยกหลักพัน
  }).format(num);
}

/// สำหรับใช้ตรวจสอบ รายการวัตถุดิบที่ระบุในเมนู มีอยู่ใน appData.ingredients หรือไม่ ถ้าไม่มีให้เพิ่มเข้าไป
function addIngredientIfAbsent(ingredientName) {
  // ตรวจสอบว่ามีชื่อวัตถุดิบหรือยัง ถ้ามีแล้วไม่ต้องทำอะไร
  if (appData.ingredients.findIndex((ing) => ing.name === ingredientName) > -1)
    return;

  // หา id ที่ไม่ซ้ำกับรายการที่มีอยู่
  let genId = "";
  do {
    let genId = Date.now().toString();
  } while (appData.ingredients.findIndex((item) => item.id === genId) >= 0);

  const id = genId;
  const name = ingredientName;
  const vol = null;
  const unit = "";
  const weight = null;

  const ingData = { id: id, name, vol, unit, weight };
  appData.ingredients.push(ingData);

  // เรียงลำดับรายการตามชื่อวัตถุดิบทันทีหลังจากเพิ่มหรือแก้ไข (ข้อ 2 และ 7)
  sortByName(appData.ingredients);
}

// เมื่อกดปุ่ม [+ เพิ่มวัตถุดิบจำนวนมาก🥩🍆🥬] ให้แสดง div และล้างข้อมูล
function openImportFromText(formId) {
  const div = document.getElementById(formId);
  div.style.display = "block";
  div.querySelector("textarea").value = "";
}

// เมื่อกดปุ่ม ยกเลิก ในส่วนของเพิ่มวัตถุดิบจำนวนมาก ให้ซ่อน div
function closeImportFromText(formId) {
  const div = document.getElementById(formId);
  div.style.display = "none";
}

// นำเข้าข้อมูล text และสร้างรายการวัตถุดิบ
function importFromText(formId, menuIngInputsId) {
  const div = document.getElementById(formId);
  const textValue = div.querySelector("textarea").value;
  const importData = convert(textValue);

  // ซ่อน div ของเพิ่มวัตถุดิบด้วย text
  div.style.display = "none";

  if (importData.length == 0) {
    alert("⚠️ ไม่พบรายการที่สามารถนำเข้าข้อมูลได้");
    return;
  }

  // สำหรับเพิ่มรายการวัตถุดิบ
  const data = { name: "", displayVal: 0, displayUnit: "" };
  for (let i = 0; i < importData.length; ++i) {
    let row = importData[i];
    data.name = row[0];
    data.displayVal = row[1];
    data.displayUnit = row[2];
    addIngredientRow(menuIngInputsId, data);
  }

  alert(
    "✅ ทำการเพิ่มรายการวัตถุดิบจำนวน " +
      importData.length +
      " รายการ เรียบร้อยแล้ว",
  );

  // เรียกคำนวณเกลือและน้ำตาลหลังจากนำเข้า
  recalculateSaltSugarInEditMenu();
}

/// ใช้แปลงข้อมูลส่วนผสมจาก Text เป็น array
/*
textInput = `
เนื้อวัว,1,กิโลกรัม
ไข่ไก่,4,ฟอง
`;

return [
    ["เนื้อวัว", 1, "กิโลกรัม"],
    ["ไข่ไก่", 4, "ฟอง"]
];
*/
function convert(textInput) {
  return textInput
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => line.split(/[,\t]/).map((v) => v.trim()))
    .filter((cols) => cols.length === 3) // ต้องมี 3 คอลัมน์เท่านั้น
    .map(([col1, col2, col3]) => {
      const num = Number(col2);

      // ต้องเป็น String, Number, String
      if (col1 === "" || col3 === "" || !Number.isFinite(num)) {
        return null;
      }

      return [col1, num, col3];
    })
    .filter((row) => row !== null);
}

/**
 * ฟังก์ชันเติมค่าให้อีกช่อง เมื่อผู้ใช้กรอกมาเพียงช่องเดียว (min หรือ max)
 */
function fillEmptyPair(minVal, maxVal) {
  const min = minVal === "" ? null : parseFloat(minVal);
  const max = maxVal === "" ? null : parseFloat(maxVal);

  if (min === null && max === null) return { min: null, max: null };
  if (min === null) return { min: max, max: max };
  if (max === null) return { min: min, max: min };
  return { min, max };
}

/**
 * ฟังก์ชันคำนวณ % เกลือและน้ำตาล (โดยน้ำหนัก) จากข้อมูลฉลากที่กรอกในฟอร์ม
 */
function calcNutritionPercent() {
  const salt = fillEmptyPair(
    document.getElementById("ing-list-salt-min").value,
    document.getElementById("ing-list-salt-max").value,
  );
  const sugar = fillEmptyPair(
    document.getElementById("ing-list-sugar-min").value,
    document.getElementById("ing-list-sugar-max").value,
  );

  const saltPercent = salt.min !== null ? (salt.min + salt.max) / 2 : null;
  const sugarPercent = sugar.min !== null ? (sugar.min + sugar.max) / 2 : null;

  return {
    saltValues: [salt.min, salt.max],
    sugarValues: [sugar.min, sugar.max],
    saltPercent,
    sugarPercent,
  };
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
