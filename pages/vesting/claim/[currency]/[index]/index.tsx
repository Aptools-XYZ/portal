import { NextPage } from 'next'
import Head from 'next/head'
import { Fragment } from 'react'
import Claim from '../../../../../components/VestingClaim/Claim'
import Footer from '../../../../../components/Footer/Footer'
import Header from '../../../../../components/Header/Header'

const VestingClaimPage: NextPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Claim Vesting on Aptos</title>
      </Head>
      <Header />
      <Claim />
      <Footer />
    </Fragment>
  )
}

export default VestingClaimPage
