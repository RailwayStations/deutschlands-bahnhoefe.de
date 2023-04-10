import $ from "jquery";
import bsCustomFileInput from "bs-custom-file-input";
import {
  getAPIURI,
  fetchCountries,
  getQueryParameter,
  isBlank,
  isNotBlank,
  getCountryByCode,
  getAuthorization,
} from "./common";
import "bootstrap";
import { getI18n } from "./i18n";
import { UserProfile } from "./settings/UserProfile";
import { Modal } from "bootstrap";

var uploadModal;

function startUpload() {
  "use strict";

  if (isBlank($("#countryCode").val())) {
    // for missing stations get countryCode from DropDown
    $("#countryCode").val($("#countrySelect").val());
  }
  uploadModal = new Modal(document.getElementById("upload-process"));
  uploadModal.show();
  return true;
}

function unauthorized() {
  "use strict";

  localStorage.removeItem("access_token");
  window.location.href = "settings.php?error=" + encodeURIComponent(getI18n(s => s.settings.pleaseLogIn));
}

// example message: {"state":"REVIEW","message":"Accepted","uploadId":1,"inboxUrl":"http://inbox.railway-stations.org/1.jpg"}
function stopUpload(result) {
  "use strict";

  let message =
    getI18n(s => s.upload.unknown) + ": " + result.state + " - " + message;
  if (result.state === "REVIEW") {
    message = getI18n(s => s.upload.successful);
  } else if (result.state === "LAT_LON_OUT_OF_RANGE") {
    message = getI18n(s => s.upload.latLonOutOfRange);
  } else if (result.state === "NOT_ENOUGH_DATA") {
    message = getI18n(s => s.upload.notEnoughData);
  } else if (result.state === "UNSUPPORTED_CONTENT_TYPE") {
    message = getI18n(s => s.upload.unsupportedContentType);
  } else if (result.state === "CONFLICT") {
    message = getI18n(s => s.upload.conflict);
  } else if (result.state === "PHOTO_TOO_LARGE") {
    message = getI18n(s => s.upload.maxSize);
  } else if (result.state === "ERROR") {
    message = getI18n(s => s.upload.error);
  }

  if (isNotBlank(result.filename)) {
    const link = `${getI18n(s => s.upload.photoUnderReview)}: <a href='${
      result.inboxUrl
    }' target='blank'>${result.inboxUrl}</a>`;
    document.getElementById("uploaded-photo-link").innerHTML = link;
    document.getElementById("uploaded-photo-link").style.visibility = "visible";
  }

  alert(message);
  return true;
}

function createCountriesDropDown(countries) {
  "use strict";

  $(
    `<option value="">${getI18n(s => s.inbox.selectCountry)}</option>`
  ).appendTo("#countrySelect");

  countries.forEach(country => {
    $(`<option value="${country.code}">${country.name}</option>`).appendTo(
      "#countrySelect"
    );
  });
}

function initUpload() {
  const queryParameters = getQueryParameter();
  const stationId = queryParameters.stationId;
  const countryCode = queryParameters.countryCode;
  const latitude = queryParameters.latitude;
  const longitude = queryParameters.longitude;
  const title = queryParameters.title;
  const userProfile = UserProfile.currentUser();

  if (stationId) {
    $("#title-form").html(getI18n(s => s.upload.uploadPhotoFor + " " + title));
    $("#stationId").val(stationId);
    $("#countryCode").val(countryCode);
    $(".missing-station").hide();
    $("#active").removeAttr("required");
    $("#inputLatitude").removeAttr("required");
    $("#inputLongitude").removeAttr("required");
    $("#inputStationTitle").removeAttr("required");
    getCountryByCode(countryCode).then(country => {
      var overrideLicense = country.overrideLicense;
      if (isNotBlank(overrideLicense)) {
        $("#special-license-label").html(
          getI18n(s => s.upload.specialLicenseNeeded) + ": " + overrideLicense
        );
      } else {
        $(".special-license-group").hide();
        $("#specialLicense").removeAttr("required");
      }
    });
  } else {
    $(".special-license-group").hide();
    $("#specialLicense").removeAttr("required");
    $("#fileInput").removeAttr("required");
    $("#inputLatitude").val(latitude);
    $("#inputLongitude").val(longitude);
    fetchCountries().then(countries => {
      createCountriesDropDown(countries);
    });
  }

  const uploadDisabled = !userProfile.isLoggedIn();
  $("#fileInput").attr("disabled", uploadDisabled);
  $("#uploadSubmit").attr("disabled", uploadDisabled);
  if (uploadDisabled) {
    window.location.href = "settings.php?error=" + encodeURIComponent(getI18n(s => s.settings.pleaseLogIn));
  } else {
    bsCustomFileInput.init();
  }

  $("#uploadForm").on( "submit", function( event ) {    
        event.preventDefault();    
        var form = $(this)[0];        
        if (form.checkValidity() === false) {
          event.stopPropagation();
        } else {
          startUpload();
          var form = $(this)[0];
          var postData = new FormData(form);
          $.ajax({
              type: "POST",
              url: getAPIURI() + "photoUploadMultipartFormdata",
              beforeSend: function(request) {
                request.setRequestHeader("Authorization", getAuthorization());
              },
              data: postData,
              contentType: false,
              processData: false,
              success: function(data){
                uploadModal.hide();
                stopUpload(data);
              },
              statusCode: {
                401: function() {
                  unauthorized();
                }
              },              
              error: function (xhr, textStatus, error) {
                uploadModal.hide();

                console.log(textStatus + ": " + error);
              }
            });          
        }
        form.classList.add("was-validated");
      });
}

$(function () {
  initUpload();
});
