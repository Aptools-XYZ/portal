import Liquidity from 'components/Liquidity/Liquidity'
import Footer from 'components/Footer/Footer'
import Header from 'components/Header/Header'
import type { NextPage } from 'next'
import { Fragment } from 'react'
import Head from 'next/head'

const LiquidityPage: NextPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Liquidity Management on Aptos</title>
      </Head>
      <Header />
      <Liquidity />
      <Footer />
    </Fragment>
  )
}

export default LiquidityPage
