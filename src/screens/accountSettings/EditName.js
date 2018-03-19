/* @flow */
import React, { Component } from "react";
import { connect } from "react-redux";
import { View, StyleSheet, TextInput, ScrollView } from "react-native";
import type { NavigationScreenProp } from "react-navigation";

import SectionEntry from "../../components/SectionEntry";
import { updateAccount } from "../../actions/accounts";
import type { Account } from "../../types/common";

const mapStateToProps = () => ({});
const mapDispatchToProps = {
  updateAccount
};

class EditName extends Component<{
  updateAccount: ($Shape<Account>) => *,
  navigation: NavigationScreenProp<{
    params: {
      account: Account
    },
    goBack: () => void
  }>
}> {
  static navigationOptions = {
    title: "Edit Name"
  };
  onNameEndEditing = e => {
    const { account } = this.props.navigation.state.params;
    e.nativeEvent.text.length
      ? this.props.updateAccount({ name: e.nativeEvent.text, id: account.id })
      : null;
    const { navigation } = this.props;
    navigation.goBack();
  };

  render() {
    const { account } = this.props.navigation.state.params;
    return (
      <View>
        <ScrollView style={styles.container} />
        <View style={styles.header} />
        <SectionEntry>
          <TextInput
            autoFocus
            style={styles.textInputAS}
            placeholder="Name"
            defaultValue={account.name}
            underlineColorAndroid="transparent"
            returnKeyType="done"
            maxLength={20}
            onEndEditing={this.onNameEndEditing}
          />
        </SectionEntry>
      </View>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(EditName);

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  textInputAS: {
    padding: 5
  }
});
