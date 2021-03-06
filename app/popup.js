const alertElement = document.querySelector("#alert");
const intervalToggleBtn = document.querySelector("#intervalToggle");
const refreshBtn = document.querySelector("#refresh_btn");
const companyList = document.querySelector("#company");
const settingBtn = document.querySelector("#setting_btn");

//설정값 초기화 코드 작성
if (!localStorage.getItem("initialrized")) {
  localStorage.setItem("initialrized", "yes");
  localStorage.setItem("alarmOn", "T"); //초기 설정은 알람 켜짐
  localStorage.setItem("cycleInterval", "10"); //초기설정은 10분마다
}

//chrome.storage.local.remove(["de.dhl12321344"], function () {});

//스토리지 기반으로 목록을 불러온다.
updateFromStorge();
//api를 이용해 배송사목록을 불러온다
fetch("https://apis.tracker.delivery/carriers")
  .then((res) => res.json())
  .then((companies) => {
    companies.forEach((company) => {
      const option = document.createElement("option");
      option.value = company.id + "," + company.name;
      option.innerText = company.name;
      companyList.appendChild(option);
    });
  });
chrome.browserAction.setIcon({ path: "icon_small.png" });
alertElement.innerText = null; //알림창은 창이 열릴때마다 초기화

//setting 버튼 클릭
settingBtn.addEventListener("click", function () {
  location.href = "setting.html";
});

//택배 추가 버튼 클릭
document.querySelector("#addParcel").addEventListener("click", function () {
  //addingParcel: storge에 저장할 객체
  const IdAndName = document.querySelector("#company").value.split(",");
  const addingCompanyId = IdAndName[0];
  const addingCompanyName = IdAndName[1];
  const addingPostNumber = document.querySelector("#postNumber").value;
  chrome.runtime.sendMessage({
    type: "addParcel",
    companyid: addingCompanyId,
    companyName: addingCompanyName,
    postNumber: addingPostNumber,
  });
});

function updateFromStorge() {
  document.querySelector("#list").innerHTML = null; //초기화후다시그림
  chrome.storage.local.get(null, function (parcels) {
    let allKeys = Object.keys(parcels);
    console.log(allKeys);
    console.log(parcels);
    for (let i = 0; i < allKeys.length; i++) {
      addParcelList(parcels[allKeys[i]], allKeys[i]);
    }
  });
}

function addParcelList(parcel, key) {
  const div = document.createElement("div");
  const btn = document.createElement("button");
  div.id = key;
  console.log("실행중?");
  const lastIndex = parcel.progresses.length - 1;
  div.innerHTML = `${parcel.companyName} ${parcel.postNumber} [${parcel.progresses[lastIndex].location.name}] [${parcel.progresses[lastIndex].status.text}]`;
  btn.innerHTML = "delete";
  btn.addEventListener("click", deleteParcel);
  document.querySelector("#list").appendChild(div).appendChild(btn);
  const detailDiv = document.createElement("div");
  div.showDetail = true;
  div.appendChild(detailDiv);
  for (let i = lastIndex - 1; i >= 0; i--) {
    const detailElement = document.createElement("div");
    detailElement.textContent = `${parcel.companyName} ${parcel.postNumber} [${parcel.progresses[i].location.name}] [${parcel.progresses[i].status.text}]`;
    detailDiv.style.display = "none";
    detailDiv.appendChild(detailElement);
  }
  div.addEventListener("click", function () {
    if (!div.showDetail) {
      detailDiv.style.display = "none";
      div.showDetail = true;
    } else {
      detailDiv.style.display = "block";
      div.showDetail = false;
    }
  });
}

function deleteParcel(e) {
  const deletingId = e.target.parentNode.id;
  chrome.storage.local.remove([deletingId], function () {
    alertElement.innerText = "해당 운송장을 삭제했습니다.";
  });
  updateFromStorge();
}
refreshBtn.addEventListener("click", function () {
  chrome.runtime.sendMessage({
    type: "reflashParcel",
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === "updateParcel") {
    updateFromStorge();
  }
  if (request.type === "cantFoundNumber") {
    alertElement.innerText =
      "해당 운송장이 존재하지 않거나 에러가 발생했습니다.";
  }
});
