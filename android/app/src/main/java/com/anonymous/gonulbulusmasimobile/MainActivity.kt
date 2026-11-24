
package com.anonymous.gonulbulusmasimobile

import android.os.Bundle
import android.os.Build
import android.view.WindowManager

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import io.invertase.notifee.NotifeeApiModule

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String {
        return NotifeeApiModule.getMainComponent(
            "gonul-bulusmasi-mobile"
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)

        // Android 8.1 ve üzeri
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {

            // Ekran kilitliyken arama ekranının görünmesine izin ver.
            setShowWhenLocked(true)

            // Gelen aramada ekranın açılmasını sağla.
            setTurnScreenOn(true)

        } else {

            // Eski Android sürümleri
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,
            fabricEnabled
        )
    }
}
