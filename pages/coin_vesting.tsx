import Vesting from 'components/Vesting/Vesting'
import Footer from 'components/Footer/Footer'
import Header from 'components/Header/Header'
import type { NextPage } from 'next'
import { Fragment } from 'react'
import Head from 'next/head'

const VestingPage: NextPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Vesting tool on Aptos</title>
      </Head>
      <Header />
      <Vesting />
      <Footer />
    </Fragment>
  )
}

export default VestingPage
