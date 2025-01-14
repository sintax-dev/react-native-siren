import React from 'react'
import { Alert, Linking } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import apisauce from 'apisauce'

const createAPI = (baseURL = 'https://itunes.apple.com/br/') => {
  const api = apisauce.create({
    baseURL,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 10000
  })

  return {
    getLatest: (bundleId) => api.get('lookup', {bundleId})
  }
}

const performCheck = (props = {}) => {
  const { version = DeviceInfo.getVersion(), bundleId = DeviceInfo.getBundleId() } = props
  let updateIsAvailable = false
  const api = createAPI()

  // Call API
  return api.getLatest(bundleId).then(response => {
    let latestInfo = null
    // Did we get our exact result?
    if (response.ok && response.data.resultCount === 1) {
      latestInfo = response.data.results[0]
      // check for version difference

      updateIsAvailable = latestInfo.version !== version
    }

    return {updateIsAvailable, ...latestInfo}
  })
}

const attemptUpgrade = async (appId) => {
  try {
    // failover if itunes - a bit excessive
    const appStoreURI = `itms-apps://apps.apple.com/app/id${appId}?mt=8`
    const appStoreURL = `https://apps.apple.com/app/id${appId}?mt=8`

    const supported = await Linking.canOpenURL(appStoreURI);

    if (supported) {
      return await Linking.openURL(appStoreURI)
    } else {
      return await Linking.openURL(appStoreURL)
    }
  } catch (error) {
    console.log(error)
  }
}

const showUpgradePrompt = (appId, {
  title = 'Update Available',
  message = 'There is an updated version available on the App Store. Would you like to upgrade?',
  buttonUpgradeText = 'Upgrade',
  buttonCancelText = 'Cancel',
  forceUpgrade = false
}) => {
  const buttons = [{
    text: buttonUpgradeText, onPress: () => attemptUpgrade(appId).catch(error => console.log(error))
  }]

  if (forceUpgrade === false) {
    buttons.push({text: buttonCancelText})
  }

  Alert.alert(
      title,
      message,
      buttons,
      { cancelable: !!forceUpgrade }
  )
}

const promptUser = (defaultOptions = {}, versionSpecificOptions = [], checkProps = {}) => {
  performCheck(checkProps).then(sirenResult => {
      const options =
        versionSpecificOptions.find(o => o.localVersion === DeviceInfo.getVersion())
        || defaultOptions

      showUpgradePrompt(sirenResult.trackId, options)
  })
}

export default {
  promptUser,
  performCheck
}
