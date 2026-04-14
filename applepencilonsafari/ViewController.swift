//
//  ViewController.swift
//  applepencilonsafari
//
//  Created by 편호장 on 3/19/26.
//

import UIKit
import WebKit

final class ViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        webView.navigationDelegate = self
        webView.scrollView.isScrollEnabled = true
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        webView.configuration.userContentController.add(self, name: "controller")

        loadPage(named: "Main")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // Reserved for future native settings and diagnostics hooks.
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url else {
            return .cancel
        }

        if url.isFileURL {
            return .allow
        }

        UIApplication.shared.open(url, options: [:], completionHandler: nil)
        return .cancel
    }

    private func loadPage(named name: String) {
        guard let url = Bundle.main.url(forResource: name, withExtension: "html") else {
            return
        }

        webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.resourceURL!)
    }
}
