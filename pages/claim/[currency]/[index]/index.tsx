import { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Fragment } from 'react'
import ClaimV1 from '../../../../components/Claim/ClaimV1'
import ClaimV2 from '../../../../components/Claim/ClaimV2'
import Footer from '../../../../components/Footer/Footer'
import Header from '../../../../components/Header/Header'

const ClaimPage: NextPage = () => {
  const router = useRouter()
  const { ver } = router.query

  console.log(router.query)

  return (
    <Fragment>
      <Head>
        <title>Claim Airdrop on Aptos</title>
      </Head>
      <Header />
      {!ver ? <ClaimV1 /> : <ClaimV2 />}
      <Footer />
    </Fragment>
  )
}

export default ClaimPage
