import React, { useState } from "react"
import axios from "axios"
import languageEncoding from "detect-file-encoding-and-language"
import { BACKEND_URL } from "../utils/constants"

function FileUpload() {
  const [uploadId, setUploadId] = useState({})

  if (typeof window !== "undefined") {
    let videoData = document.getElementById("videoFile")
    videoData?.addEventListener("change", (e) => {
      e.preventDefault()
      let fileData = e.target.files[0]

      languageEncoding(fileData).then((fileInfo) => console.log(fileInfo))

      const videoEl = document.createElement("video")
      videoEl.src = window.URL.createObjectURL(fileData)

      videoEl.onloadedmetadata = (e) => {
        window.URL.revokeObjectURL(videoEl.src)
        const { name, type, size } = fileData
        const { videoWidth, videoHeight } = videoEl
        console.log(
          `Filename: ${name} - Type: ${type} - Size: ${videoWidth}px x ${videoHeight}px  size:${size} `
        )
      }
    })
  }

  //   Upload large file with Multipart upload from front end
  // getting that presigned url from the people

  const uploadData = async () => {
    let videoData = document.getElementById("videoFile")
    const file = videoData.files[0]
    const fileName = file.name
    const fileSize = file.size
    const fileType = file.type.split("/")[1]
    const url = `${BACKEND_URL}/aws`

    try {
      let res = await axios.post(`${url}/getUploadId`, { fileName: fileName })
      const uploadTempId = res.data.uploadId
      console.log(uploadTempId)
      setUploadId(uploadTempId)
      const chunkSize = 6 * 1024 * 1024
      const chunkCount = Math.floor(fileSize / chunkSize) + 1
      console.log(`ChunkCount: ${chunkCount}`)

      //   multipart url
      let multiUploadArray = []

      let getSignedUrlRes = await axios.post(`${url}/getUploadPart`, {
        fileName,
        partNumber: chunkCount,
        uploadId: uploadTempId.UploadId,
        fileType,
      })

      const allPartUploadPromises = []

      for (let uploadCount = 1; uploadCount < chunkCount + 1; uploadCount++) {
        let start = (uploadCount - 1) * chunkSize
        let end = uploadCount * chunkSize
        let fileBlob =
          uploadCount < chunkCount ? file.slice(start, end) : file.slice(start)

        let preSignedUrl = getSignedUrlRes.data.parts[uploadCount - 1].signedUrl

        allPartUploadPromises.push(
          axios.put(preSignedUrl, fileBlob).then((response) => {
            let EtagHeader = response.headers["etag"]

            let uploadPartDetails = {
              ETag: EtagHeader,
              PartNumber: uploadCount,
            }
            multiUploadArray.push(uploadPartDetails)
          })
        )
      }

      await Promise.all(allPartUploadPromises)

      console.log(`Multipart array ${multiUploadArray}`)

      await axios.post(`${url}/completeUpload`, {
        fileName: fileName,
        parts: multiUploadArray,
        uploadId: uploadTempId.UploadId,
      })
    } catch (error) {
      console.log(error)
    }
  }

  // abort the data upload of the element
  const cancelUpload = () => {
    const multipart_fileInput = document.getElementById("videoFile")
    const file = multipart_fileInput.files[0]
    const fileName = file.name
    const url = `${BACKEND_URL}/aws`
    console.log({ fileName: fileName, uploadId: uploadId })
    axios
      .post(`${url}/abortUpload`, {
        fileName,
        uploadId,
      })
      .then((res) => console.log(res))
      .catch((err) => {
        console.log(err)
      })
    clearInterval()
  }

  return (
    <div>
      <p className="tw-my-2">Image upload</p>
      <input type="file" id="videoFile" />
      <div className="tw-flex">
        <button
          onClick={uploadData}
          className="tw-mx-2 tw-my-2 tw-bg-green-400 tw-px-2 tw-rounded-xl"
        >
          Upload
        </button>
        <button
          onClick={cancelUpload}
          className="tw-bg-red-500 tw-px-3 tw-rounded-xl tw-my-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default FileUpload
