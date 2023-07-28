import Airdrop from 'components/Airdrop/Airdrop'
import Footer from 'components/Footer/Footer'
import Header from 'components/Header/Header'
import type { NextPage } from 'next'
import { Fragment } from 'react'
import Head from 'next/head'

const AirdropPage: NextPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Airdrop tool on Aptos</title>
      </Head>
      <Header />
      <Airdrop />
      <Footer />
    </Fragment>
  )
}

export default AirdropPage
