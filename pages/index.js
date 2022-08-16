import Head from "next/head"
import Image from "next/image"
import styles from "../styles/Home.module.css"

import FileUpload from "../components/fileUpload"

export default function Home() {
  return (
    <>
      <FileUpload />
    </>
  )
}
