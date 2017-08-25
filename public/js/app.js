/**
 * Created by rolangom on 3/4/17.
 */

const MenuItems = {
  SESSION: 'SESSION',
  POSTS: 'POSTS',
  POST_EDIT: 'POST_EDIT',
};

// imports
const observable = mobx.observable;
const observer = mobxReact.observer;

// semanticUIReact imports
const Menu = semanticUIReact.Menu;
const Segment = semanticUIReact.Segment;
const Header = semanticUIReact.Header;
const Label = semanticUIReact.Label;
const Icon = semanticUIReact.Icon;
const Dimmer = semanticUIReact.Dimmer;
const Loader = semanticUIReact.Loader;
const Item = semanticUIReact.Item;
const Form = semanticUIReact.Form;
const Button = semanticUIReact.Button;
const Divider = semanticUIReact.Divider;
const Container = semanticUIReact.Container;

const urlRegex = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
const ImagesPostPath = 'images/posts';

const fbui = new firebaseui.auth.AuthUI(firebase.auth());

// stores
const stores = {};
stores.funcs = {};
stores.funcs.loadFileOnImg = (file, img) => {
  const reader = new FileReader();
  reader.onload = ((aImg) => { return (e) => aImg.src = e.target.result;})(img);
  reader.readAsDataURL(file);
};

stores.initStore = observable({
  user: null,
  activeMenu: MenuItems.SESSION,

  init() {
    console.log('init store');
    firebase.auth().useDeviceLanguage();
    firebase.auth().onAuthStateChanged(user => { user ? this.handleSignedInUser(user) : this.signOut(); });
    if (!this.isLogged) { fbui.start('.firebaseui-container', uiConfig); }
  },

  get isLogged() { return this.user !== null; },
  get email() { return this.user.email; },

  setMenu(menu) { this.activeMenu = menu; },
  isActiveMenu(menu, m2) {
    return menu === this.activeMenu || (m2 && m2 === this.activeMenu);
  },
  handleSignedInUser(user) { this.user = user; },
  signOut() {
    this.user = null;
    this.setMenu(MenuItems.SESSION);
    firebase.auth().signOut().then(() => setTimeout(() => fbui.start('.firebaseui-container', uiConfig), 1000));
  },
});

stores.postStore = observable({
  isLoading: false,
  post: { key: '', title: '', descr: '', imgUrl: '', linkUrl: '', fileImg: null },
  posts: [],

  get isPostNew() { return this.post.key === ''; },
  get isPostValid() {
    return (this.isBasicFieldsValid && this.post.imgUrl.match(urlRegex))
      || (this.isBasicFieldsValid && this.isPostNew && this.post.fileImg != null);
  },
  get isBasicFieldsValid() { return this.post.title.length > 3 && this.post.descr.length > 5; },

  onPostChange(name, value) {
    this.post[name] = value;
  },
  onChange(event) {
    this.onPostChange(event.target.name, event.target.value);
  },
  onFileChange(event, img) {
    console.log('onFileChange ', event);
    const file = event.target.files[0];
    if (file) {
      stores.funcs.loadFileOnImg(file, img);
      this.post.fileImg = file;
    }
  },
  uploadImage() {
    return new Promise((resolve, reject) =>{
      if (this.post.fileImg) {
        firebase.storage().ref().child(`${ImagesPostPath}/${this.post.key}`).put(this.post.fileImg).then(snapshot => {
          this.post.imgUrl = snapshot.downloadURL;
          console.log('post.fileImg completed', this.post.imgUrl);
          resolve(true);
        }).catch(e => reject(e));
      } else {
        resolve(false)
      }
    });
  },

  newPost() {
    this.resetPost();
    stores.initStore.setMenu(MenuItems.POST_EDIT);
  },
  viewPost(post) {
    this.post = post;
    stores.initStore.setMenu(MenuItems.POST_EDIT);
  },

  resetPost() { this.post = { key: '', title: '', descr: '', imgUrl: '', linkUrl: '', fileImg: null }; },
  save() {
    this.isLoading = true;
    this.checkPostKey();
    this.uploadImage().then(ok => {
      this.updatePost();
      this.isLoading = false;
      stores.initStore.setMenu(MenuItems.POSTS);
    }).catch(e => alert(`An error has ocurred. ${e.message}`));
  },
  cancel() {
    this.resetPost();
    stores.initStore.setMenu(MenuItems.POSTS);
  },

  // If key exists just return to update the existing one, otherwise create a new one.
  checkPostKey() {
    if (this.post.key) { return; }
    const newKey = firebase.database().ref().child('posts').push().key;
    this.post.key = newKey;
  },
  updatePost() {
    firebase.database().ref(`posts/${this.post.key}`).set({
      title: this.post.title,
      descr: this.post.descr,
      imgUrl: this.post.imgUrl,
      linkUrl: this.post.linkUrl,
    });
  },
  deletePost(post) {
    const isConfirmed = confirm(`Are you sure to delete ${post.title}?`);
    if (isConfirmed) {
      firebase.database().ref(`posts/${post.key}`).remove();
      firebase.storage().ref().child(`${ImagesPostPath}/${post.key}`).delete()
        .then(() => {console.log('image deleted')}).catch(err => console.log('error deleting img', err));
      if (stores.initStore.isActiveMenu(MenuItems.POSTS)) { this.getPosts(); }
      this.cancel();
    }
  },

  getPosts() {
    this.posts = [];
    this.isLoading = true;
    const postsRef = firebase.database().ref('posts');
    postsRef.once('value', snapshot => {
      snapshot.forEach(postSnapshot => {
        const post = postSnapshot.val();
        post.key = postSnapshot.key;
        this.posts.push(post);
      });
      this.isLoading = false;
    });
  }
});

const Session = observer(({store}) => (
  <Segment>
    {store.isLogged ?
      <UserInfo user={store.user} /> :
      <div className="firebaseui-container"></div>
    }
  </Segment>
));

const UserInfo = ({user}) => (
  <div>
    <Header as="h1">User Info</Header>
    <Label>
      <Icon name='mail' /> {user.email}
    </Label>
  </div>
);

const PostItem = ({post, onEditClick, onDeleteClick}) => (
  <Item>
    <Item.Image src={post.imgUrl} />

    <Item.Content>
      <Item.Header as="a" href={post.linkUrl}>{post.title}</Item.Header>
    <Item.Description>{post.descr}</Item.Description>

    <Item.Extra>
      <Button icon primary onClick={() => onEditClick(post)}>
        <Icon name="edit"/> Edit
      </Button>
      <Button color="red" floated='right' icon onClick={() => onDeleteClick(post)}>
        <Icon name="delete"/> Delete
      </Button>
    </Item.Extra>
    </Item.Content>
  </Item>
);

const PostsGroup = ({posts, onEditClick, onDeleteClick}) => (
  <Item.Group divided>
    {posts.map((p) => <PostItem key={p.key} post={p} onEditClick={onEditClick} onDeleteClick={onDeleteClick} />)}
  </Item.Group>
);

const PostDetailView = observer(({store}) => {
  const post = store.post;
  const onChange = e => store.onChange(e);
  let postImg = null;
  const onFileChange = e => store.onFileChange(e, postImg);
  return (
    <Dimmer.Dimmable as={Segment} dimmed={store.isLoading}>
      <Dimmer active={store.isLoading} inverted>
        <Loader>Loading...</Loader>
      </Dimmer>

      <Container text>
        <Label>{post.key? `ID: ${post.key}`: 'New'}</Label>

        <Form>
          <Form.Input name="title" label="Title" defaultValue={post.title} onChange={onChange} required />
          <Form.TextArea name="descr" label="Description" defaultValue={post.descr} onChange={onChange} required />
          <Form.Input name="linkUrl" label="Link URL" defaultValue={post.linkUrl} onChange={onChange} />
          <Form.Input name="imgUrl" label="Image URL" defaultValue={post.imgUrl} onChange={onChange} required />
          <Form.Field>
            <div>
              <Label>Or Upload Image</Label>
              <input type="file" name="fileImg" accept="image/*" onChange={e => onFileChange(e)} />
            </div>
            <div>
              <img src={post.imgUrl} className="ui medium centered image" ref={(img) => { postImg = img; }} />
            </div>
          </Form.Field>
        </Form>
        <Divider hidden/>
        <Container textAlign="center">
          <Button.Group>
            <Button icon disabled={store.isLoading} onClick={() => store.cancel()}>
              <Icon name="arrow circle left" /> Cancel
            </Button>
            <Button.Or />
            <Button icon loading={store.isLoading} disabled={!store.isPostValid} positive onClick={() => store.save()}>
              <Icon name="save" />Save
            </Button>
            {post.key ?
              <Button color="red" onClick={() => store.deletePost(post)}>
                <Icon name="delete" /> Delete
              </Button> : '' }
          </Button.Group>
        </Container>
      </Container>
    </Dimmer.Dimmable>
  );
});

const Posts = observer(class extends React.Component {
  componentDidMount() { this.props.store.getPosts(); }
  render() {
    const store = this.props.store;
    return (
      <Dimmer.Dimmable as={Segment} dimmed={store.isLoading}>
        <Dimmer active={store.isLoading} inverted>
          <Loader>Loading...</Loader>
        </Dimmer>
        <Button icon onClick={() => store.newPost()} floated="right">
          <Icon name="plus" /> New
        </Button>
        <PostsGroup posts={store.posts} onEditClick={p => store.viewPost(p)} onDeleteClick={p => store.deletePost(p)} />
      </Dimmer.Dimmable>
    );
  }
});

const AppMenu = observer(({store}) => (
  <Menu inverted>
    <Menu.Item header>React Firebase UI Web Auth Example</Menu.Item>

    {store.isLogged ?
      <Menu.Menu position='right'>
        <Menu.Item name='Posts' active={store.isActiveMenu(MenuItems.POSTS, MenuItems.POST_EDIT)} onClick={() => store.setMenu(MenuItems.POSTS)} />
        <Menu.Item name='Profile' active={store.isActiveMenu(MenuItems.SESSION)} onClick={() => store.setMenu(MenuItems.SESSION)} />
        <Menu.Item name='sign out' onClick={() => store.signOut()}>
          <Icon name='sign out' /> Sign Out
        </Menu.Item>
      </Menu.Menu>
      : ''}
  </Menu>
));

const AppContent = observer(({stores}) => (
  <div>
    {stores.initStore.isActiveMenu(MenuItems.SESSION) ? <Session store={stores.initStore} /> : ''}
    {stores.initStore.isActiveMenu(MenuItems.POSTS) ? <Posts store={stores.postStore} />: ''}
    {stores.initStore.isActiveMenu(MenuItems.POST_EDIT) ? <PostDetailView store={stores.postStore} />: ''}
  </div>
));

class App extends React.Component {
  componentDidMount() { this.props.stores.initStore.init(); }
  render() {
    const stores = this.props.stores;
    return (
      <div>
        <AppMenu store={stores.initStore} />
        <AppContent stores={stores} />
      </div>
    );
  }
}

ReactDOM.render(
  <App stores={stores} />,
  document.getElementById('root')
);
