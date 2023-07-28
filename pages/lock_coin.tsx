import CreateCoin from 'components/Coin/CreateCoin'
import Footer from 'components/Footer/Footer'
import Header from 'components/Header/Header'
import type { NextPage } from 'next'
import { Fragment } from 'react'
import Head from 'next/head'
import Locker from '../components/Locker/Lock'

const Contributor: NextPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Lock Your Coins/Liquidity on Aptos instantly</title>
      </Head>
      <Header />
      <Locker />
      <Footer />
    </Fragment>
  )
}

export default Contributor
