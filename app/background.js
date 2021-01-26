//택배정보 저장은 chrome.storage로 한다
//택배정보 관련 외(설정같은거) 정보 저장은 localStorage로 한다

console.log("thisisback" + findCurrentTime());
//설정값 초기화 코드 작성
if (!localStorage.getItem("initialrized")) {
  localStorage.setItem("initialrized", "yes");
  localStorage.setItem("alarmOn", "T"); //초기 설정은 알람 켜짐
  localStorage.setItem("cycleInterval", "10"); //초기설정은 10분마다
}

const base_url = "https://apis.tracker.delivery/carriers/";

let intervalingId;
let sec = Number(localStorage.getItem("cycleInterval"));

//앱 시작하면 돌기 시작
setIntervaling(sec);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  //if 루틴시간 설정이 바뀌는 메세지를 받으면? 변경한 시간으로 인터벌 셋팅
  if (request.type === "changeCycleSetting") {
    const sec = Number(localStorage.getItem("cycleInterval"));
    setIntervaling(sec);
  }
  //if새로운 parcel추가 메세지를 받았다면?
  //존재하는 운송장인지 확인, 존재하면 스토리지 저장 후 checkParcel
  if (request.type === "addParcel") {
    fetch(base_url + `${request.companyid}/tracks/${request.postNumber}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else if (res.status === 404) {
          return Promise.reject();
        }
      })
      .then((res) => {
        const key = request.companyid + request.postNumber;
        chrome.storage.local.set(
          {
            [key]: {
              companyid: request.companyid,
              companyName: request.companyName,
              postNumber: request.postNumber,
              progresses: res.progresses, //test: []
            },
          },
          function () {
            chrome.runtime.sendMessage({
              type: "updateParcel",
            });
          }
        );
      })
      .catch((err) => {
        chrome.storage.local.remove([request.postNumber], function () {
          chrome.runtime.sendMessage({
            type: "cantFoundNumber",
          });
        });
      });
  }
  //if 새로고침 메세지를 받으면 곧바로 checkParcel실행
  if (request.type === "reflashParcel") {
    checkParcels();
  }
});

//모든 parcel를 검사한다. 변동사항이 있으면 ui 업데이트나 알림을 보낸다.
function checkParcels() {
  chrome.storage.local.get(null, (parcels) => {
    let allKeys = Object.keys(parcels);
    for (let i = 0; i < allKeys.length; i++) {
      const currentKey = allKeys[i];
      const checkingParcel = parcels[currentKey];
      fetch(
        base_url +
          `${checkingParcel.companyid}/tracks/${checkingParcel.postNumber}`
      )
        .then((res) => res.json())
        .then((res) => {
          const latestProgresses = res.progresses;
          if (
            checkingParcel.progresses.length < latestProgresses.length //들고온 진행상태 리스트의 길이가 더 크면 상태 변화됫다는 것
          ) {
            let progressesUpdated = {
              [currentKey]: {
                companyid: checkingParcel.companyid,
                companyName: checkingParcel.companyName,
                postNumber: checkingParcel.postNumber,
                progresses: latestProgresses,
              },
            };
            //새로운 array 저장
            chrome.storage.local.set(progressesUpdated, function () {
              console.log("!new Info!");
              //ui update or icon change
              if (chrome.extension.getViews({ type: "popup" })[0]) {
                //현재 팝업창 열린 상태임. parcel ui업데이트시키라고 popup에 msg
                chrome.runtime.sendMessage({
                  type: "updateParcel",
                });
              } else {
                //닫힌 상태면 아이콘을 변경하여 사용자에게 알려라.
                if (localStorage.setItem("alarmOn") === "T")
                  chrome.browserAction.setIcon({
                    path: "notice_icon_small.png",
                  });
              }
            });
          }
        });
      //.catch(() => {});
    }
  });
}

function setIntervaling(sec) {
  clearInterval(intervalingId); //우선 동작중인 인터벌 종료시킴
  if (sec === 777) return; //777은 인터벌 꺼진 상태라 바로 리턴
  intervalingId = setInterval(function () {
    console.log("루틴돌음");
    checkParcels();
  }, sec * 1000);
}

function findCurrentTime() {
  //이 함수를 이용해 최근 업데이트 시간을 알리자
  let today = new Date();
  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1; // 월
  let date = today.getDate(); // 날짜
  let hours = today.getHours(); // 시
  let minutes = today.getMinutes(); // 분
  let seconds = today.getSeconds(); // 초
  return (
    year +
    "년" +
    month +
    "월" +
    date +
    "일" +
    hours +
    ":" +
    minutes +
    ":" +
    seconds
  );
}
