import React, { useState } from "react"
import axios from "axios"
import languageEncoding from "detect-file-encoding-and-language"

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
    const url = "http://localhost:8080/aws"

    try {
      let res = await axios.post(`${url}/getUploadId`, { fileName: fileName })
      const uploadTempId = res.data.uploadId
      console.log(uploadTempId)
      setUploadId(uploadTempId)
      const chunkSize = 10 * 1024 * 1024
      const chunkCount = Math.floor(fileSize / chunkSize) + 1
      console.log(`ChunkCount: ${chunkCount}`)

      //   multipart url
      let multiUploadArray = []
      for (let uploadCount = 1; uploadCount < chunkCount + 1; uploadCount++) {
        let getSignedUrlRes = await axios.post(`${url}/getUploadPart`, {
          fileName,
          partNumber: uploadCount,
          uploadId: uploadTempId.UploadId,
          fileType,
        })
        let start = (uploadCount - 1) * chunkSize
        let end = uploadCount * chunkSize
        let fileBlob =
          uploadCount < chunkCount ? file.slice(start, end) : file.slice(start)
        let preSignedUrl = getSignedUrlRes.data.parts[0].signedUrl
        console.log(`preSigned ${uploadCount}:${preSignedUrl}`)
        // fileBlob.type = fileType
        console.log(`File blob  ${fileBlob}`)

        let uploadChunk = await axios.put(preSignedUrl, fileBlob)
        // let uploadChunk = await fetch(preSignedUrl, {
        //   method: "PUT",
        //   body: fileBlob,
        // })

        console.log(`Upload Chunks ${uploadChunk}`)
        console.log(`Upload Item ${uploadChunk}`)
        //

        let EtagHeader = uploadChunk.headers.get("ETag")
        console.log(EtagHeader)
        let uploadPartDetails = {
          ETag: EtagHeader,
          PartNumber: uploadCount,
        }
        multiUploadArray.push(uploadPartDetails)
      }

      console.log(`Multipart array ${multiUploadArray}`)

      const completeUpload = await axios.post(`${url}/completeUpload`, {
        fileName: fileName,
        parts: multiUploadArray,
        uploadId: uploadTempId.UploadId,
      })

      console.log(completeUpload.data, "Complete upload response")
    } catch (error) {
      console.log(err, err.stack)
    }
  }

  // abort the data upload of the element
  const cancelUpload = () => {
    const multipart_fileInput = document.getElementById("videoFile")
    const file = multipart_fileInput.files[0]
    const fileName = file.name
    const url = "http://localhost:8080/aws"
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
