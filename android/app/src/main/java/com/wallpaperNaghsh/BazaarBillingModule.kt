package com.wallpaperNaghsh

import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import ir.cafebazaar.poolakey.Connection
import ir.cafebazaar.poolakey.ConnectionState
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import ir.cafebazaar.poolakey.request.PurchaseRequest

/**
 * Cafe Bazaar in-app billing bridge (Poolakey 2.2.0).
 *
 * Exposes three JS methods:
 *   - connect(): opens the billing service connection.
 *   - getPurchasedProducts(): returns the list of owned SKUs (product ids).
 *   - purchase(sku): launches the Bazaar purchase flow, resolves true if owned.
 *
 * Poolakey drives the purchase UI via the Activity's ActivityResultRegistry, so
 * `MainActivity` (a ReactActivity → AppCompatActivity) is used directly — no
 * manual onActivityResult wiring is needed.
 *
 * RSA_PUBLIC_KEY below is set from the Bazaar developer panel → In-App Billing.
 * Empty would disable local security checks (rely on Bazaar's server-side
 * validation instead), but this app has it enabled.
 */
class BazaarBillingModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val RSA_PUBLIC_KEY =
        "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwCN9iof6MW0lGtj4oHBSfDbURiwn0VvutrHnvb+1leFZ2HNgJmVwXogC3vpCE/QtPhuE8H2Ddvviv4XP/reyutDls8KvArih/bkGQKXLyUloKZ4OhirNtj3NpCzK6TRXfNC8U8ZiGvy94yODRDSYQDCgzW2RjRtFCnoHSKtxiSuuG4lQdjxW+TvHkGT1uUczdBx9diY1aQr+zoZpUNdbzcGIZNUvP1bpUWeYSDFGL8CAwEAAQ=="
  }

  private val paymentConfiguration =
      PaymentConfiguration(
          localSecurityCheck =
              if (RSA_PUBLIC_KEY.isBlank()) SecurityCheck.Disable
              else SecurityCheck.Enable(rsaPublicKey = RSA_PUBLIC_KEY))

  private val payment by lazy { Payment(context = reactContext, config = paymentConfiguration) }

  private var connection: Connection? = null

  override fun getName(): String = "BazaarBilling"

  private fun ensureConnected(onReady: () -> Unit, onError: (String) -> Unit) {
    val existing = connection
    if (existing != null && existing.getState() == ConnectionState.Connected) {
      onReady()
      return
    }
    connection =
        payment.connect {
          connectionSucceed { onReady() }
          connectionFailed { onError(it.message ?: "connection failed") }
          disconnected {}
        }
  }

  @ReactMethod
  fun connect(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      ensureConnected(
          onReady = { promise.resolve(true) },
          onError = { promise.reject("connect_failed", it) })
    }
  }

  @ReactMethod
  fun getPurchasedProducts(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      ensureConnected(
          onReady = {
            payment.getPurchasedProducts {
              querySucceed { purchasedItems ->
                val arr = Arguments.createArray()
                purchasedItems.forEach { arr.pushString(it.productId) }
                promise.resolve(arr)
              }
              queryFailed { promise.reject("query_failed", it.message, it) }
            }
          },
          onError = { promise.reject("connect_failed", it) })
    }
  }

  @ReactMethod
  fun purchase(sku: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val activity = reactApplicationContext.currentActivity as? AppCompatActivity
      if (activity == null) {
        promise.reject("no_activity", "No AppCompatActivity to host the purchase flow")
        return@runOnUiThread
      }
      ensureConnected(
          onReady = {
            payment.purchaseProduct(
                registry = activity.activityResultRegistry,
                request = PurchaseRequest(productId = sku)) {
                  purchaseFlowBegan {}
                  failedToBeginFlow { promise.reject("flow_failed", it.message, it) }
                  purchaseSucceed { promise.resolve(true) }
                  purchaseCanceled { promise.resolve(false) }
                  purchaseFailed { promise.reject("purchase_failed", it.message, it) }
                }
          },
          onError = { promise.reject("connect_failed", it) })
    }
  }

  override fun invalidate() {
    connection?.disconnect()
    connection = null
    super.invalidate()
  }
}
