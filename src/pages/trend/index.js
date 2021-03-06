import React from 'react'
import {
  Dimensions,
  RefreshControl,
  Text,
  TouchableHighlight,
  ListView,
  View,
} from 'react-native'
import { Navigation } from 'react-native-navigation'
import { connect } from 'react-redux'

import { iconsMap } from '../../utils/AppIcons'
import { fetchTrends } from '../../redux/repository'
import styles from './styles'
import Component from '../base'
import { navigatorStyle as commonNavigatorStyle } from '../../styles' // eslint-disable-line
import RepoCard from '../../components/repo-card'

const transDate = (dateString) => {
  const time = new Date(dateString)
  return `${(time.getMonth() + 1)}/${time.getDate()} ${time.getHours()}:${time.getMinutes()}`
}

export default connect(
  store => ({
    user: store.app.user,
    trends: store.repository.trends,
  }),
  dispatch => ({ dispatch }),
)(class extends Component {
  static navigatorStyle = { ...commonNavigatorStyle }

  state = {
    refreshing: false,
    list: [],

    trends: new ListView.DataSource({
      rowHasChanged: (r1, r2) => (
        r1.id !== r2.id
      ),
      sectionHeaderHasChanged: (r1, r2) => (
        r1.id !== r2.id
      ),
    }),
  }

  load = false

  constructor(props) {
    super(props)
    if (!this.load) {
      // for DEBUG environment
      this.props.navigator.setOnNavigatorEvent(this._onNavigatorEvent.bind(this))
      this.load = true
    }

    this._onRefresh = this._onRefresh.bind(this)
    this._renderRow = this._renderRow.bind(this)
    // props.navigator.switchToTab({
    //   tabIndex: 1,
    // })
  }

  async _onNavigatorEvent(event) {
    if (event.id === 'menu') {
      // const t = await this.manager.deauthorize('github')
      this.props.navigator.toggleDrawer({
        side: 'left',
        animated: true,
      })
    } else if (event.id === 'signout') {
      Navigation.startSingleScreenApp({
        screen: {
          screen: 'app.Lobby',
          title: 'gitten',
          subtitle: 'Lobby',
          navigatorStyle: {
          },
          navigatorButtons: {
            rightButtons: [{
              title: 'add',
              id: 'add',
              icon: iconsMap['md-person-add'],
            }],
          },
        },
      })
    }
  }

  componentWillMount() {
    this._getIssues()
  }

  async _getIssues(callback) {
    this.props.dispatch(fetchTrends(callback))
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      trends: this._getDS(nextProps.trends),
    })
  }

  render() {
    return (
      <View style={styles.container}>
        <ListView
          enableEmptySections
          renderSectionHeader={(t) => (
            <View />
          )}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh}
            />
          }
          contentContainerStyle={styles.list}
          dataSource={this.state.trends}
          renderRow={this._renderRow}
          onEndReachedThreshold={300}
        />
      </View >
    )
  }

  _renderRow(item, sectionKey) {
    return (
      <RepoCard
        style={{ width: this.width, borderBottomColor: '#ddd', borderBottomWidth: 1 }}
        owner={item.owner}
        updatedAt={item.updatedAt}
        stargazers={item.stargazers}
        forks={item.forks}
        name={item.name}
        onPress={() => {
          this.pushRepository(item.owner.login, item.name)
        }}
      />
    )
  }

  _onRefresh() {
    this.setState({ refreshing: true });
    setTimeout(() => {
      this._getIssues(() => {
        this.setState({ refreshing: false });
      })
    }, 500)
  }

  _getDS(obj) {
    return this.state.trends.cloneWithRows(obj)
  }
})
