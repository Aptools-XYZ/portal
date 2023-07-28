import CreateCoinCom from 'components/Coin/CreateCoin'
import Footer from 'components/Footer/Footer'
import Header from 'components/Header/Header'
import type { NextPage } from 'next'
import { Fragment } from 'react'
import Head from 'next/head'

const CreateCoin: NextPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Coin Creator on Aptos</title>
      </Head>
      <Header />
      <CreateCoinCom />
      <Footer />
    </Fragment>
  )
}

export default CreateCoin
