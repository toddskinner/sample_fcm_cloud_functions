/**         FCM CLOUD FUNCTIONS         **/

/**
 * Triggers when a provider gets a new booking request for approval and sends a notification.
 *
 * Users save their device notification tokens to `/users/{userAuthUid}/fcm_token`.
 */
exports.sendProviderApprovalRequiredFCM = functions.database.ref('/provider_preapproval_bookings_fcm_trigger/{providerUid}/{transactionId}').onWrite((change, context) => {
  var tokensSnapshot;
  const customerUid = change.after.val();
    console.log('customerUid: ' + customerUid);
  const providerUid = context.params.providerUid;
    console.log('providerUid: ' + providerUid);
  return admin.database().ref('/users').child(providerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(customerUid);
  }).then((customer) => {
  const customerPhoto = customer.photoURL;
    console.log('customerPhoto: ' + customerPhoto);
  const customerFirstName = customer.displayName.split(" ")[0];
    console.log('customerFirstName: ' + customerFirstName);
    // Notification details.
    const payload = {
      notification: {
        title: 'You have a new booking request!',
        body: `${customerFirstName} sent you a booking request for approval.`,
        icon: customerPhoto
      },
    };
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when a provider approves a booking request for approval and the credit card payment is approved in 
 * BookingRequestForApproval_NotificationForProvider.  Likely also triggers when an internet banking, Alipay, or
 * Tesco payment goes through (To Be Confirmed)
 */
exports.sendCustomerPaymentConfirmationFCM = functions.database.ref('/customer_payment_confirmations_fcm_trigger/{customerUid}/{transactionId}').onWrite((change, context) => {
  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = context.params.customerUid;
  const providerUid = val.providerAuthUid;
  const status = val.approvalStatus; 

  return admin.database().ref('/users').child(customerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(providerUid);
  }).then((provider) => {
  const providerPhoto = provider.photoURL;
    console.log('providerPhoto: ' + providerPhoto);
  const providerFirstName = provider.displayName.split(" ")[0];
    console.log('providerFirstName: ' + providerFirstName);

    // Notification details.
    const payload = {
      notification: {
        title: 'Your Payment Has Been Confirmed',
        body: `Your payment for your booking with ${providerFirstName} has been confirmed.`,
        icon: providerPhoto
      },
    };

    // Listing all tokens.
    // const tokens = Object.keys(tokensSnapshot.val());
    const tokens = Object.keys(tokensSnapshot.val);

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokens, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when a provider approves a booking request for approval and the credit card payment is declined in 
 * BookingRequestForApproval_NotificationForProvider.  
 */

exports.sendCustomerCreditCardDeclinedFCM = functions.database.ref('/credit_card_declined_fcm_trigger/{customerUid}/{transactionId}').onWrite((change, context) => {
  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = context.params.customerUid;
  const transactionId = context.params.transactionId;
  const providerUid = val.providerAuthUid;

  return admin.database().ref('/users').child(customerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(providerUid);
  }).then((provider) => {
  const providerPhoto = provider.photoURL;
    console.log('providerPhoto: ' + providerPhoto);
  const providerFirstName = provider.displayName.split(" ")[0];
    console.log('providerFirstName: ' + providerFirstName);

    // Notification details.
    const payload = {
      notification: {
        title: 'Your Credit Card Has Been Declined',
        body: `Your credit card payment for your booking with ${providerFirstName} has been declined.`,
        icon: providerPhoto
      },
    };

    // Listing all tokens.
    const tokens = Object.keys(tokensSnapshot.val());

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokens, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });

});

/**
 * Triggers when a customer's payment is approved within the customer view.  This happens in CompletedPaymentActivity (for internet 
 * banking and Alipay transactions) and CreditCardDeclined_NotificationToCustomer fragment. For Tesco payments this happens via the 
 * cloud function adminCheckPaidStatusOfLiveTescoBarcodes   which hits the following db ref: 
 * '/retrieve_and_move_provider_pending_tesco_payment_confirmation_fcm_trigger_item'
 */

exports.sendProviderPaymentConfirmationFCM = functions.database.ref('/provider_payment_confirmations_fcm_trigger/{providerUid}/{transactionId}').onWrite((change, context) => {
  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = val.customerAuthUid;
    console.log('customerUid: ' + customerUid);
  const providerUid = context.params.providerUid;
    console.log('providerUid: ' + providerUid);
  return admin.database().ref('/users').child(providerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(customerUid);
  }).then((customer) => {
  const customerPhoto = customer.photoURL;
    console.log('customerPhoto: ' + customerPhoto);
  const customerFirstName = customer.displayName.split(" ")[0];
    console.log('customerFirstName: ' + customerFirstName);
    // Notification details.
    const payload = {
      notification: {
        title: 'Payment Confirmed',
        body: `${customerFirstName} has completed payment for their booking with you.`,
        icon: customerPhoto
      },
    };
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when a customer gets a new booking approval or decline and sends a notification.  Triggered from
 * BookingRequestForApproval_NotificationForProvider.  
 */
exports.sendCustomerApprovedOrDeclinedFCM = functions.database.ref('/customer_bookings_responses_fcm_trigger/{customerUid}/{transactionId}').onWrite((change, context) => {
  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = context.params.customerUid;
  const providerUid = val.providerAuthUid;
  const status = val.approvalStatus; 

  return admin.database().ref('/users').child(customerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(providerUid);
  }).then((provider) => {
  const providerPhoto = provider.photoURL;
    console.log('providerPhoto: ' + providerPhoto);
  const providerFirstName = provider.displayName.split(" ")[0];
    console.log('providerFirstName: ' + providerFirstName);

    // Notification details.
    const payload = {
      notification: {
        title: 'You have a response to your booking request!',
        body: `${providerFirstName} responded to your booking request for approval.`,
        icon: providerPhoto
      },
    };

    // Listing all tokens.
    // const tokens = Object.keys(tokensSnapshot.val());
    const tokens = tokensSnapshot;
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokens, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when the admin marks the transaction as complete in AdminManageTransactionsDetailsFragment.  Sends FCM to customer
 * notifying them that the transaction has been marked complete.
 */

exports.sendTransactionCompleteToCustomerFCM = functions.database.ref('/customer_transaction_complete_confirmation_fcm_trigger/{customerUid}/{transactionId}').onWrite((change, context) => {

  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = context.params.customerUid;
  const providerUid = val.providerAuthUid;
  const status = val.approvalStatus; 

  return admin.database().ref('/users').child(customerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(providerUid);
  }).then((provider) => {
  const providerPhoto = provider.photoURL;
    console.log('providerPhoto: ' + providerPhoto);
  const providerFirstName = provider.displayName.split(" ")[0];
    console.log('providerFirstName: ' + providerFirstName);

    // Notification details.
    const payload = {
      notification: {
        title: 'Transaction Complete',
        body: `Your job provided by ${providerFirstName} has been completed.`,
        icon: providerPhoto
      },
    };

    // Listing all tokens.
    const tokens = Object.keys(tokensSnapshot.val());

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokens, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when the admin marks the transaction as complete in AdminManageTransactionsDetailsFragment.  Sends FCM to provider
 * notifying them that the transaction has been marked complete.
 */

exports.sendTransactionCompleteToProviderFCM = functions.database.ref('/provider_transaction_complete_confirmation_fcm_trigger/{providerUid}/{transactionId}').onWrite((change, context) => {

  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = change.after.val();
  const providerUid = context.params.providerUid;
    
  return admin.database().ref('/users').child(providerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(customerUid);
  }).then((customer) => {
  const customerPhoto = customer.photoURL;
    console.log('customerPhoto: ' + customerPhoto);
  const customerFirstName = customer.displayName.split(" ")[0];
    console.log('customerFirstName: ' + customerFirstName);
    // Notification details.
    const payload = {
      notification: {
        title: 'Transaction Complete',
        body: `Your job for ${customerFirstName} has been completed.`,
        icon: customerPhoto
      },
    };
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when the provider in CancellationReasonFragment (ProviderActivity) cancels transaction.  Sends FCM to customer
 * notifying them that the transaction has been cancelled.
 */

exports.sendCancellationFromProviderToCustomerFCM = functions.database.ref('/provider_to_customer_cancellation_fcm_trigger/{customerUid}/{transactionId}').onWrite((change, context) => {
  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = context.params.customerUid;
  const providerUid = val.providerAuthUid;
  const status = val.approvalStatus; 

  return admin.database().ref('/users').child(customerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(providerUid);
  }).then((provider) => {
  const providerPhoto = provider.photoURL;
    console.log('providerPhoto: ' + providerPhoto);
  const providerFirstName = provider.displayName.split(" ")[0];
    console.log('providerFirstName: ' + providerFirstName);

    // Notification details.
    const payload = {
      notification: {
        title: 'Your Booking Has Been Cancelled',
        body: `${providerFirstName} has cancelled your booking.`,
        icon: providerPhoto
      },
    };

    // Listing all tokens.
    const tokens = Object.keys(tokensSnapshot.val());

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokens, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when the customer in CancellationReasonFragment (CustomerActivity) cancels transaction.  Sends FCM to provider
 * notifying them that the transaction has been cancelled.
 */

exports.sendCancellationFromCustomerToProviderFCM = functions.database.ref('/customer_to_provider_cancellation_fcm_trigger/{providerUid}/{transactionId}').onWrite((change, context) => {
  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = change.after.val();
  const providerUid = context.params.providerUid;
    
  return admin.database().ref('/users').child(providerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(customerUid);
  }).then((customer) => {
  const customerPhoto = customer.photoURL;
    console.log('customerPhoto: ' + customerPhoto);
  const customerFirstName = customer.displayName.split(" ")[0];
    console.log('customerFirstName: ' + customerFirstName);
    // Notification details.
    const payload = {
      notification: {
        title: 'Your Booking Has Been Cancelled',
        body: `${customerFirstName} has cancelled their booking with you.`,
        icon: customerPhoto
      },
    };
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when the customer's recipient bank account info is missing in AdminManageTransactionsDetailsFragment.   
 * Sends FCM to customer notifying them that we need their bank account info.
 */

exports.sendRequestForBankAccountInfoToCustomerFCM = functions.database.ref('/customer_request_for_bank_account_info_fcm_trigger/{customerUid}/{transactionId}').onWrite((change, context) => {

  var tokensSnapshot;
  const val = change.after.val();
  const customerUid = context.params.customerUid;
    
  return admin.database().ref('/users').child(customerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(customerUid);
  }).then((customer) => {
  const customerPhoto = customer.photoURL;
    console.log('customerPhoto: ' + customerPhoto);
  const customerFirstName = customer.displayName.split(" ")[0];
    console.log('customerFirstName: ' + customerFirstName);
    // Notification details.
    const payload = {
      notification: {
        title: 'Request For Bank Account Info',
        body: `We are missing your bank account details required to process your refund.`,
        icon: customerPhoto
      },
    };
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});


/**
 * Triggers when the provider's recipient bank account info is missing in AdminManageTransactionsDetailsFragment.   
 * Sends FCM to provider notifying them that we need their bank account info.
 */

exports.sendRequestForBankAccountInfoToProviderFCM = functions.database.ref('/provider_request_for_bank_account_info_fcm_trigger/{providerUid}/{transactionId}').onWrite((change, context) => {

  var tokensSnapshot;
  const val = change.after.val();
  const providerUid = context.params.providerUid;
    
  return admin.database().ref('/users').child(providerUid).child('fcm_token').once('value').then((results) => {
    tokensSnapshot = results.val();
      console.log('tokensSnapshot: ' + tokensSnapshot);
  }).then(() => {
    return admin.auth().getUser(providerUid);
  }).then((provider) => {
  const providerPhoto = provider.photoURL;
    console.log('providerPhoto: ' + providerPhoto);
  const providerFirstName = provider.displayName.split(" ")[0];
    console.log('providerFirstName: ' + providerFirstName);
    // Notification details.
    const payload = {
      notification: {
        title: 'Request For Bank Account Info',
        body: `We are missing your bank account details required to process payment to you.`,
        icon: providerPhoto
      },
    };
    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(tokensSnapshot, payload);
  }).then((response) => {
    // For each message check if there was an error.
    const tokensToRemove = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
        }
      }
    });
    return Promise.all(tokensToRemove);
  });
});

exports.sendChatNotificationFCM = functions.database.ref('/chat_groups/{chatGroupId}/{latestChatMessage}').onWrite((change, context) => {
  const chatGroupId = context.params.chatGroupId;
  const latestChatMessage = context.params.latestChatMessage;
  const data = change.after.val();
  const chatParticipantID_A = data.chatParticipantAuthUid_A;
  const chatParticipantID_B = data.chatParticipantAuthUid_B;
  const chatParticipantName_A = data.chatParticipantName_A;
  const chatParticipantName_B = data.chatParticipantName_B;
  const chatParticipantPhoto_A = data.chatParticipantPhotoUriString_A;
  const chatParticipantPhoto_B = data.chatParticipantPhotoUriString_B;
  const lastMessageSender = data.latestMessageSender;

  // If un-follow we exit the function.
  if (!change.after.val()) {
    return console.log('Event is empty');
  }

  // Get the list of device notification tokens.
  if(lastMessageSender == chatParticipantName_A){
    const getDeviceTokensPromise = admin.database().ref('/users').child(chatParticipantID_B).child('fcm_token').once('value');  
  } else if(lastMessageSender == chatParticipantName_B) {
    const getDeviceTokensPromise = admin.database().ref('/users').child(chatParticipantID_A).child('fcm_token').once('value');
  } else {
    return console.log('Neither A or B is the sender');
  }
  
  return Promise.all([getDeviceTokensPromise]).then(results => {
    const tokensSnapshot = results[0];

    // Notification details.
    if(lastMessageSender == chatParticipantName_A){
      const payload = {
        notification: {
          title: 'You have a new message!',
          body: `${chatParticipantName_A} sent you a message.`,
          icon: chatParticipantPhoto_A
        }
      };
    } else if(lastMessageSender == chatParticipantName_B){
      const payload = {
        notification: {
          title: 'You have a new message!',
          body: `${chatParticipantName_B} sent you a message.`,
          icon: chatParticipantPhoto_B
        }
      };
    }

    // Get the token.
    const token = tokensSnapshot.val();
    console.log('Token: ' + token);

    // Send notifications to all tokens.
    return admin.messaging().sendToDevice(token, payload).then(response => {
      // For each message check if there was an error.
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Failure sending notification to', tokens[index], error);
          // Cleanup the tokens who are not registered anymore.
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
          }
        }
      });
      return Promise.all(tokensToRemove);
    });
  });
});
