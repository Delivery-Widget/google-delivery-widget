//택배정보 저장은 chrome.storage로 한다
//택배정보 관련 외(설정같은거) 정보 저장은 localStorage로 한다

console.log("thisisback" + findCurrentTime());

const base_url = "https://apis.tracker.delivery/carriers/";

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  //if 인터벌 정지 메세지 받았다면?

  //if 인터벌 재개 메세지 받았다면?

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
              progresses: res.progresses,
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
          if (!latestProgresses) {
            //존재하지 않는 운송장일시
            chrome.storage.local.remove([currentKey], function () {
              chrome.runtime.sendMessage({
                type: "alertNotExist",
              });
            });
          } else if (
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
                chrome.browserAction.setIcon({ path: "icon_alert.png" });
              }
            });
          }
        })
        .catch(() => {});
    }
  });
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
    "年" +
    month +
    "月" +
    date +
    "日" +
    hours +
    ":" +
    minutes +
    ":" +
    seconds
  );
}
